import type { Job } from 'bullmq';
import { createWorker } from '@/lib/queue';
import { campaignRepository } from '@/repositories/campaign.repository';
import { publishToAllPlatforms } from '@/services/publishing/parallel-publisher';
import { notifyPublishResult } from '@/services/notifications/whatsapp-notifier';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { sessionRepository } from '@/repositories/session.repository';
import type { ScheduledJobData } from './scheduler.service';
import type { CampaignDraft } from '@/domain/types';

/**
 * Processes a scheduled post job.
 * Fetches campaign, publishes to all platforms, notifies user.
 */
async function processScheduledPost(job: Job<ScheduledJobData>): Promise<void> {
  const { campaignId, userId, phoneNumber, clientId } = job.data;

  const campaigns = await campaignRepository.findByUser(userId, 100);
  const campaign = campaigns.find((c) => c.id === campaignId);

  if (!campaign) {
    console.warn(`[scheduler] Campaign ${campaignId} not found — skipping`);
    return;
  }

  if (campaign.status === 'CANCELLED') {
    console.info(`[scheduler] Campaign ${campaignId} was cancelled — skipping`);
    return;
  }

  await campaignRepository.setPublishing(campaignId);

  // Notify user that scheduled post is being published
  await whatsappService.sendText(
    phoneNumber,
    '📅 *Post agendado publicando agora!*\n\nAguarde a confirmação com os links...',
  ).catch(() => null);

  const results = await publishToAllPlatforms(
    userId,
    {
      copy: campaign.originalCopy,
      videoUrl: campaign.videoUrl ?? undefined,
      photoUrl: campaign.photoUrl ?? undefined,
      coverPhotoUrl: campaign.thumbnailUrl ?? undefined,
    },
    clientId,
  );

  const resultMap: Record<string, { success: boolean; postUrl?: string; error?: string }> = {};
  for (const r of results) {
    resultMap[r.platform] = { success: r.success, postUrl: r.postUrl, error: r.error };
  }

  const successCount = results.filter((r) => r.success).length;
  const status =
    successCount === 0 ? 'FAILED' : successCount < results.length ? 'PARTIAL_FAILURE' : 'PUBLISHED';

  await campaignRepository.setResults(campaignId, resultMap, status);

  // Save campaignId to session for "retentar"
  const session = await sessionRepository.findActiveByPhone(phoneNumber).catch(() => null);
  if (session) {
    const currentDraft = (session.campaignDraft ?? {}) as CampaignDraft;
    await sessionRepository.updateStep(session.id, 'menu', {
      ...currentDraft,
      lastCampaignId: campaignId,
    }).catch(() => null);
  }

  await notifyPublishResult({ phoneNumber, results });
}

/**
 * Starts the BullMQ worker. Call once on server startup.
 */
export function startSchedulerWorker() {
  const worker = createWorker(processScheduledPost);

  worker.on('completed', (job) => {
    console.info(`[scheduler] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[scheduler] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
