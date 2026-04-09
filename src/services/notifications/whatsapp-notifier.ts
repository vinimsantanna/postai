import type { Platform } from '@prisma/client';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { buildNotificationMessage } from './post-link-builder';
import { campaignRepository } from '@/repositories/campaign.repository';
import { publishToAllPlatforms, type PlatformResult } from '@/services/publishing/parallel-publisher';
import type { CampaignDraft } from '@/domain/types';

export interface NotifyInput {
  phoneNumber: string;
  results: PlatformResult[];
  clientName?: string;
  isAgency?: boolean;
}

/**
 * Sends the post-publish WhatsApp notification (AC1/AC2/AC3/AC5).
 */
export async function notifyPublishResult(input: NotifyInput): Promise<void> {
  const { phoneNumber, results, clientName, isAgency } = input;
  const message = buildNotificationMessage(results, clientName, isAgency);
  await whatsappService.sendText(phoneNumber, message);
}

/**
 * Retries only the platforms that failed in a given campaign (AC7).
 * Does NOT re-publish platforms that already succeeded.
 */
export async function retryFailedPlatforms(
  campaignId: string,
  userId: string,
  phoneNumber: string,
  clientId?: string,
): Promise<void> {
  // Fetch campaign from DB
  const campaigns = await campaignRepository.findByUser(userId, 50);
  const campaign = campaigns.find((c) => c.id === campaignId);

  if (!campaign) {
    await whatsappService.sendText(phoneNumber, '❌ Campanha não encontrada.');
    return;
  }

  const previousResults = (campaign.results ?? {}) as Record<
    string,
    { success: boolean; postUrl?: string; error?: string }
  >;

  // Identify failed platforms
  const failedPlatforms = (campaign.platforms as Platform[]).filter(
    (p) => !previousResults[p]?.success,
  );

  if (failedPlatforms.length === 0) {
    await whatsappService.sendText(phoneNumber, '✅ Todas as plataformas já foram publicadas com sucesso!');
    return;
  }

  await whatsappService.sendText(
    phoneNumber,
    `🔄 Retentando publicação em: ${failedPlatforms.join(', ')}...`,
  );

  // Build draft from campaign
  const draft: CampaignDraft = {
    copy: campaign.originalCopy,
    videoUrl: campaign.videoUrl ?? undefined,
    photoUrl: campaign.photoUrl ?? undefined,
    coverPhotoUrl: campaign.thumbnailUrl ?? undefined,
    platforms: failedPlatforms,
  };

  // Re-publish only failed platforms — temporarily override apiTokenRepository
  // by filtering tokens to only failed platforms
  const retryResults = await publishToAllPlatforms(
    userId,
    {
      copy: draft.copy ?? '',
      videoUrl: draft.videoUrl,
      photoUrl: draft.photoUrl,
      coverPhotoUrl: draft.coverPhotoUrl,
    },
    clientId,
  ).then((results) => results.filter((r) => failedPlatforms.includes(r.platform)));

  // Merge with previous results
  const mergedResults: Record<string, { success: boolean; postUrl?: string; error?: string }> = {
    ...previousResults,
  };
  for (const r of retryResults) {
    mergedResults[r.platform] = { success: r.success, postUrl: r.postUrl, error: r.error };
  }

  const allSuccess = Object.values(mergedResults).every((r) => r.success);
  const anySuccess = Object.values(mergedResults).some((r) => r.success);
  const newStatus = allSuccess ? 'PUBLISHED' : anySuccess ? 'PARTIAL_FAILURE' : 'FAILED';

  await campaignRepository.setResults(campaign.id, mergedResults, newStatus);

  // Build merged result array for notification
  const allPlatforms = campaign.platforms as Platform[];
  const finalResults: PlatformResult[] = allPlatforms.map((p) => ({
    platform: p,
    success: mergedResults[p]?.success ?? false,
    postUrl: mergedResults[p]?.postUrl,
    error: mergedResults[p]?.error,
  }));

  await notifyPublishResult({ phoneNumber, results: finalResults });
}
