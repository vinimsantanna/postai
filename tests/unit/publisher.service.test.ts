import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/publishing/parallel-publisher');
vi.mock('@/repositories/campaign.repository');
vi.mock('@/repositories/session.repository');
vi.mock('@/services/notifications/whatsapp-notifier');
vi.mock('@/services/whatsapp/whatsapp.service', () => ({
  whatsappService: { sendText: vi.fn().mockResolvedValue(undefined) },
}));

import { runPublish } from '@/services/publishing/publisher.service';
import { publishToAllPlatforms } from '@/services/publishing/parallel-publisher';
import { campaignRepository } from '@/repositories/campaign.repository';
import { sessionRepository } from '@/repositories/session.repository';
import { notifyPublishResult } from '@/services/notifications/whatsapp-notifier';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';

const mockCampaign = { id: 'camp-1', userId: 'user-1', platforms: ['INSTAGRAM', 'TIKTOK'] };
const draft = { copy: 'Meu post!', videoUrl: 'https://supabase/video.mp4' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(campaignRepository.create).mockResolvedValue(mockCampaign as never);
  vi.mocked(campaignRepository.setPublishing).mockResolvedValue({} as never);
  vi.mocked(campaignRepository.setResults).mockResolvedValue({} as never);
  vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue(null);
  vi.mocked(notifyPublishResult).mockResolvedValue(undefined);
});

describe('runPublish', () => {
  it('creates campaign, publishes and saves PUBLISHED status on full success', async () => {
    vi.mocked(publishToAllPlatforms).mockResolvedValue([
      { platform: 'INSTAGRAM', success: true, postUrl: 'https://ig.com/p/1' },
      { platform: 'TIKTOK', success: true, postUrl: 'https://tiktok.com/v/1' },
    ]);

    await runPublish('user-1', '+5511999', draft);

    expect(campaignRepository.create).toHaveBeenCalledOnce();
    expect(campaignRepository.setPublishing).toHaveBeenCalledWith('camp-1');
    expect(campaignRepository.setResults).toHaveBeenCalledWith('camp-1', expect.any(Object), 'PUBLISHED');
    expect(notifyPublishResult).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: '+5511999' }));
  });

  it('saves PARTIAL_FAILURE when some platforms fail', async () => {
    vi.mocked(publishToAllPlatforms).mockResolvedValue([
      { platform: 'INSTAGRAM', success: true, postUrl: 'https://ig.com/p/1' },
      { platform: 'TIKTOK', success: false, error: 'Token expired' },
    ]);

    await runPublish('user-1', '+5511999', draft);

    expect(campaignRepository.setResults).toHaveBeenCalledWith('camp-1', expect.any(Object), 'PARTIAL_FAILURE');
  });

  it('saves FAILED and sends error message when all platforms fail', async () => {
    vi.mocked(publishToAllPlatforms).mockResolvedValue([
      { platform: 'INSTAGRAM', success: false, error: 'Auth error' },
      { platform: 'TIKTOK', success: false, error: 'Auth error' },
    ]);

    await runPublish('user-1', '+5511999', draft);

    expect(campaignRepository.setResults).toHaveBeenCalledWith('camp-1', expect.any(Object), 'FAILED');
  });

  it('saves FAILED and notifies user when publishToAllPlatforms throws', async () => {
    vi.mocked(publishToAllPlatforms).mockRejectedValue(new Error('Redis down'));

    await runPublish('user-1', '+5511999', draft);

    expect(campaignRepository.setResults).toHaveBeenCalledWith('camp-1', {}, 'FAILED');
    expect(whatsappService.sendText).toHaveBeenCalledWith('+5511999', expect.stringContaining('❌'));
  });

  it('saves lastCampaignId to session when session exists', async () => {
    vi.mocked(publishToAllPlatforms).mockResolvedValue([
      { platform: 'INSTAGRAM', success: true },
    ]);
    vi.mocked(sessionRepository.findActiveByPhone).mockResolvedValue({
      id: 'sess-1', campaignDraft: {}, currentStep: 'menu',
    } as never);
    vi.mocked(sessionRepository.updateStep).mockResolvedValue({} as never);

    await runPublish('user-1', '+5511999', draft);

    expect(sessionRepository.updateStep).toHaveBeenCalledWith(
      'sess-1', 'menu', expect.objectContaining({ lastCampaignId: 'camp-1' }),
    );
  });
});
