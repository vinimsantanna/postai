import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockJob, mockQueue, mockWorker } = vi.hoisted(() => {
  const mockJob = { remove: vi.fn() };
  const mockQueue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }), getJob: vi.fn() };
  const mockWorker = { on: vi.fn().mockReturnThis() };
  return { mockJob, mockQueue, mockWorker };
});

vi.mock('@/lib/queue', () => ({
  getScheduledQueue: vi.fn().mockReturnValue(mockQueue),
  createWorker: vi.fn().mockReturnValue(mockWorker),
}));
vi.mock('@/repositories/campaign.repository');
vi.mock('@/services/publishing/parallel-publisher');
vi.mock('@/services/notifications/whatsapp-notifier');
vi.mock('@/services/whatsapp/whatsapp.service', () => ({
  whatsappService: { sendText: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/repositories/session.repository');

import { schedulePost, cancelScheduledPost, listScheduledCampaigns } from '@/services/scheduling/scheduler.service';
import { startSchedulerWorker } from '@/services/scheduling/job-processor';
import { createWorker } from '@/lib/queue';
import { campaignRepository } from '@/repositories/campaign.repository';

beforeEach(() => vi.clearAllMocks());

describe('schedulePost', () => {
  it('adds a delayed BullMQ job with campaignId as jobId', async () => {
    await schedulePost({
      campaignId: 'camp-1',
      userId: 'user-1',
      phoneNumber: '+5511999',
      scheduledAt: new Date(Date.now() + 60_000),
    });

    expect(mockQueue.add).toHaveBeenCalledWith(
      'publish',
      expect.objectContaining({ campaignId: 'camp-1' }),
      expect.objectContaining({ jobId: 'camp-1', delay: expect.any(Number) }),
    );
  });
});

describe('cancelScheduledPost', () => {
  it('removes job and returns true when job exists', async () => {
    mockQueue.getJob.mockResolvedValue(mockJob);

    const result = await cancelScheduledPost('camp-1');

    expect(mockJob.remove).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when job does not exist', async () => {
    mockQueue.getJob.mockResolvedValue(null);

    const result = await cancelScheduledPost('camp-ghost');

    expect(result).toBe(false);
  });
});

describe('listScheduledCampaigns', () => {
  it('returns only future SCHEDULED campaigns sorted by date', async () => {
    const now = new Date();
    const future1 = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const future2 = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 60 * 60 * 1000);

    vi.mocked(campaignRepository.findByUser).mockResolvedValue([
      { id: 'c1', status: 'SCHEDULED', scheduledAt: future2, platforms: ['INSTAGRAM'], originalCopy: '' },
      { id: 'c2', status: 'SCHEDULED', scheduledAt: future1, platforms: ['TIKTOK'], originalCopy: '' },
      { id: 'c3', status: 'SCHEDULED', scheduledAt: past, platforms: ['YOUTUBE'], originalCopy: '' },
      { id: 'c4', status: 'PUBLISHED', scheduledAt: future1, platforms: ['LINKEDIN'], originalCopy: '' },
    ] as never);

    const result = await listScheduledCampaigns('user-1');

    expect(result).toHaveLength(2);
    expect(result[0].campaignId).toBe('c2'); // future1 comes first
    expect(result[0].index).toBe(1);
    expect(result[1].campaignId).toBe('c1');
  });

  it('returns empty array when no scheduled campaigns', async () => {
    vi.mocked(campaignRepository.findByUser).mockResolvedValue([]);

    const result = await listScheduledCampaigns('user-1');
    expect(result).toEqual([]);
  });
});

describe('startSchedulerWorker', () => {
  it('creates worker and registers event listeners', () => {
    startSchedulerWorker();

    expect(createWorker).toHaveBeenCalledOnce();
    expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
  });
});
