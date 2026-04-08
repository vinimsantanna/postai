import type { Platform } from '@prisma/client';

export interface PostLink {
  platform: Platform;
  url: string;
  label: string;
}

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
 * Builds the correct post URL for each platform given the raw postId/videoId
 * returned by the publishing API.
 */
export function buildPostUrl(platform: Platform, postId: string): string {
  switch (platform) {
    case 'INSTAGRAM':
      return `https://www.instagram.com/p/${postId}/`;
    case 'TIKTOK':
      // TikTok publisher returns full URL directly; fall through if it looks like an ID
      if (postId.startsWith('http')) return postId;
      return `https://www.tiktok.com/video/${postId}`;
    case 'LINKEDIN':
      return `https://www.linkedin.com/feed/update/${postId}`;
    case 'YOUTUBE':
      return `https://youtu.be/${postId}`;
  }
}

export function formatPlatformLine(
  platform: Platform,
  success: boolean,
  postUrl?: string,
  error?: string,
): string {
  const emoji = PLATFORM_EMOJI[platform];
  const name = PLATFORM_NAME[platform];

  if (success && postUrl) {
    return `${emoji} *${name}:* ✅ ${postUrl}`;
  }
  if (success) {
    return `${emoji} *${name}:* ✅ Publicado`;
  }

  const reason = error ? summarizeError(error) : 'erro desconhecido';
  return `${emoji} *${name}:* ❌ ${reason}`;
}

/**
 * Builds the full success/partial/failure notification message.
 */
export function buildNotificationMessage(
  results: Array<{ platform: Platform; success: boolean; postUrl?: string; error?: string }>,
  clientName?: string,
): string {
  const successCount = results.filter((r) => r.success).length;
  const total = results.length;

  const lines: string[] = [];

  if (successCount === total) {
    lines.push('🎉 *Post publicado com sucesso!*');
  } else if (successCount > 0) {
    lines.push('⚠️ *Post publicado com pendências:*');
  } else {
    lines.push('❌ *Não foi possível publicar.*');
  }

  if (clientName) {
    lines.push(`👤 *Cliente:* ${clientName}`);
  }

  lines.push('');

  for (const r of results) {
    lines.push(formatPlatformLine(r.platform, r.success, r.postUrl, r.error));
  }

  if (successCount < total && successCount > 0) {
    lines.push('');
    lines.push('🔁 Para retentar as plataformas com falha, responda:');
    lines.push('`retentar`');
  }

  if (successCount === 0) {
    lines.push('');
    lines.push('🔁 Para tentar novamente, responda: `retentar`');
    lines.push('⚙️ Ou reconecte suas contas: postai.app/settings/social');
  }

  return lines.join('\n');
}

function summarizeError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('token')) {
    return 'Token expirado — reconecte em postai.app/settings';
  }
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429')) {
    return 'Limite de publicações atingido — tente mais tarde';
  }
  if (lower.includes('timeout') || lower.includes('network') || lower.includes('5')) {
    return 'Erro temporário — tente novamente';
  }
  return error.slice(0, 80);
}
