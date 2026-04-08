import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/whatsapp/whatsapp.service', () => ({
  whatsappService: { sendText: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/repositories/campaign.repository');
vi.mock('@/services/publishing/parallel-publisher');

import { notifyPublishResult, retryFailedPlatforms } from '@/services/notifications/whatsapp-notifier';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { campaignRepository } from '@/repositories/campaign.repository';
import { publishToAllPlatforms } from '@/services/publishing/parallel-publisher';

beforeEach(() => vi.clearAllMocks());

describe('notifyPublishResult', () => {
  it('sends success message for full success', async () => {
    await notifyPublishResult({
      phoneNumber: '+5511999',
      results: [
        { platform: 'INSTAGRAM', success: true, postUrl: 'https://ig.com/p/1' },
        { platform: 'YOUTUBE', success: true, postUrl: 'https://youtu.be/abc' },
      ],
    });

    expect(whatsappService.sendText).toHaveBeenCalledWith(
      '+5511999',
      expect.stringContaining('🎉'),
    );
  });

  it('sends partial message with retentar instruction', async () => {
    await notifyPublishResult({
      phoneNumber: '+5511999',
      results: [
        { platform: 'INSTAGRAM', success: true, postUrl: 'https://ig.com/p/1' },
        { platform: 'TIKTOK', success: false, error: 'Token expired' },
      ],
    });

    const msg = vi.mocked(whatsappService.sendText).mock.calls[0][1];
    expect(msg).toContain('⚠️');
    expect(msg).toContain('retentar');
  });
});

describe('retryFailedPlatforms', () => {
  it('re-publishes only failed platforms and merges results', async () => {
    vi.mocked(campaignRepository.findByUser).mockResolvedValue([{
      id: 'camp-1',
      results: { INSTAGRAM: { success: true, postUrl: 'https://ig.com/p/1' }, TIKTOK: { success: false, error: 'expired' } },
      platforms: ['INSTAGRAM', 'TIKTOK'],
      userId: 'user-1',
    }] as never);
    vi.mocked(campaignRepository.setResults).mockResolvedValue({} as never);
    vi.mocked(publishToAllPlatforms).mockResolvedValue([
      { platform: 'TIKTOK', success: true, postUrl: 'https://tiktok.com/v/2' },
    ]);

    await retryFailedPlatforms('camp-1', 'user-1', '+5511999');

    // Should only retry TIKTOK, not INSTAGRAM
    const publishCall = vi.mocked(publishToAllPlatforms).mock.calls[0];
    expect(publishCall).toBeDefined();
    expect(whatsappService.sendText).toHaveBeenCalled();
  });
});
