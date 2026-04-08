import type { Platform } from '@prisma/client';
import { publishToAllPlatforms, type PlatformResult } from './parallel-publisher';
import { campaignRepository } from '@/repositories/campaign.repository';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import type { CampaignDraft } from '@/domain/types';

const PLATFORM_EMOJI: Record<Platform, string> = {
  INSTAGRAM: '📸',
  TIKTOK: '🎵',
  LINKEDIN: '💼',
  YOUTUBE: '▶️',
};

const PLATFORM_NAME: Record<Platform, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
};

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
  // Determine connected platforms (from draft or all connected)
  const platforms = (draft.platforms ?? ['INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'YOUTUBE']) as Platform[];

  // Create campaign record
  const campaign = await campaignRepository.create({
    userId,
    clientId,
    copy: draft.copy ?? '',
    videoUrl: draft.videoUrl,
    thumbnailUrl: draft.thumbnailUrl,
    platforms,
  });

  await campaignRepository.setPublishing(campaign.id);

  let results: PlatformResult[] = [];
  try {
    results = await publishToAllPlatforms(
      userId,
      {
        copy: draft.copy ?? '',
        videoUrl: draft.videoUrl ?? '',
        thumbnailUrl: draft.thumbnailUrl,
      },
      clientId,
    );
  } catch (err) {
    // Catastrophic failure (no platforms connected, etc.)
    await campaignRepository.setResults(campaign.id, {}, 'FAILED');
    await whatsappService.sendText(
      phoneNumber,
      '❌ Não foi possível publicar. Verifique se suas redes sociais estão conectadas em postai.app/settings',
    );
    return;
  }

  // Save results and determine overall status
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

  // Build notification message
  const lines = ['✅ *Publicação concluída!*', ''];
  for (const r of results) {
    const emoji = PLATFORM_EMOJI[r.platform];
    const name = PLATFORM_NAME[r.platform];
    if (r.success && r.postUrl) {
      lines.push(`${emoji} *${name}:* ✅ ${r.postUrl}`);
    } else if (r.success) {
      lines.push(`${emoji} *${name}:* ✅ Publicado`);
    } else {
      lines.push(`${emoji} *${name}:* ⚠️ Falhou — ${r.error ?? 'erro desconhecido'}`);
    }
  }

  if (status === 'PARTIAL_FAILURE') {
    lines.push('');
    lines.push('💡 Para reconectar plataformas com falha: postai.app/settings/social');
  }

  await whatsappService.sendText(phoneNumber, lines.join('\n'));
}
