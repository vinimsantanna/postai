import type { Platform } from '@prisma/client';
import { publishToAllPlatforms, type PlatformResult } from './parallel-publisher';
import { publishInstagramStory } from './platforms/instagram.publisher';
import { apiTokenRepository } from '@/repositories/api-token.repository';
import { campaignRepository } from '@/repositories/campaign.repository';
import { notifyPublishResult } from '@/services/notifications/whatsapp-notifier';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { sessionRepository } from '@/repositories/session.repository';
import type { CampaignDraft } from '@/domain/types';

/**
 * Creates campaign, publishes in parallel, saves results, notifies user.
 * Designed to run fire-and-forget after sending the "publicando..." message.
 */
export async function runPublish(
  userId: string,
  phoneNumber: string,
  draft: CampaignDraft,
  clientId?: string,
): Promise<void> {
  const platforms = (draft.platforms ?? ['INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'YOUTUBE']) as Platform[];

  const campaign = await campaignRepository.create({
    userId,
    clientId,
    copy: draft.copy ?? '',
    videoUrl: draft.videoUrl,
    photoUrl: draft.photoUrl,
    thumbnailUrl: draft.coverPhotoUrl,
    platforms,
  });

  await campaignRepository.setPublishing(campaign.id);

  let results: PlatformResult[] = [];
  try {
    results = await publishToAllPlatforms(
      userId,
      {
        copy: draft.copy ?? '',
        videoUrl: draft.videoUrl,
        photoUrl: draft.photoUrl,
        coverPhotoUrl: draft.coverPhotoUrl,
      },
      clientId,
    );
  } catch (err) {
    await campaignRepository.setResults(campaign.id, {}, 'FAILED');
    await whatsappService.sendText(
      phoneNumber,
      '❌ Não foi possível publicar. Verifique se suas redes sociais estão conectadas em postai.app/settings',
    );
    return;
  }

  if (results.length === 0) {
    await campaignRepository.setResults(campaign.id, {}, 'FAILED');
    const msg = clientId
      ? '⚠️ Este cliente não tem plataformas conectadas. Acesse *postai.app/settings* para conectar.'
      : '⚠️ Nenhuma plataforma conectada. Acesse *postai.app/settings* para conectar suas redes sociais.';
    await whatsappService.sendText(phoneNumber, msg);
    return;
  }

  const resultMap: Record<string, { success: boolean; postUrl?: string; error?: string }> = {};
  for (const r of results) {
    resultMap[r.platform] = { success: r.success, postUrl: r.postUrl, error: r.error };
  }

  const successCount = results.filter((r) => r.success).length;
  const status =
    successCount === 0
      ? 'FAILED'
      : successCount < results.length
        ? 'PARTIAL_FAILURE'
        : 'PUBLISHED';

  await campaignRepository.setResults(campaign.id, resultMap, status);

  // Save campaignId to session draft so user can type "retentar"
  const session = await sessionRepository.findActiveByPhone(phoneNumber);
  if (session) {
    const currentDraft = (session.campaignDraft ?? {}) as CampaignDraft;
    await sessionRepository.updateStep(session.id, 'menu', {
      ...currentDraft,
      lastCampaignId: campaign.id,
    });
  }

  await notifyPublishResult({ phoneNumber, results, clientName: clientId ? undefined : undefined, isAgency: !!clientId });

  // Publish to Instagram Stories if requested (fire-and-forget, non-blocking)
  if (draft.withStories) {
    publishInstagramStoryIfConnected(userId, draft, clientId, phoneNumber).catch((err) =>
      console.error('[stories] Error publishing to Stories:', err),
    );
  }
}

async function publishInstagramStoryIfConnected(
  userId: string,
  draft: CampaignDraft,
  clientId: string | undefined,
  phoneNumber: string,
): Promise<void> {
  const tokens = await apiTokenRepository.findByUser(userId, clientId);
  const igToken = tokens.find((t) => t.platform === 'INSTAGRAM');
  if (!igToken) return;

  await publishInstagramStory(igToken.accessToken, draft.videoUrl, draft.photoUrl);
  await whatsappService.sendText(phoneNumber, '📖 Story publicado no Instagram!');
}
