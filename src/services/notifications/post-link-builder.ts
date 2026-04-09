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
  isAgency?: boolean,
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
    if (isAgency) {
      lines.push('⚙️ Para reconectar: acesse o painel, selecione o cliente e reconecte a conta');
    } else {
      lines.push('⚙️ Ou reconecte suas contas: postai.app/settings/social');
    }
  }

  return lines.join('\n');
}

function summarizeError(error: string): string {
  const lower = error.toLowerCase();

  // Extract error details from JSON API responses
  const jsonMatch = error.match(/\{.*\}/s);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        error?: { message?: string; code?: number; error_subcode?: number };
      };
      const { message: apiMsg, code, error_subcode: sub } = parsed?.error ?? {};

      // Instagram/Meta error codes
      if (code === 190) {
        if (sub === 460 || sub === 467) return 'Token expirado — reconecte a conta no Instagram';
        return `Token Instagram inválido (${code}.${sub ?? 0}) — reconecte a conta`;
      }
      if (code === 200 || code === 10) {
        return 'Permissão negada — reconecte e aceite todas as permissões';
      }
      if (code === 9007 || sub === 2207035 || sub === 2207001) {
        return 'Proporção da imagem inválida para o feed — use entre 4:5 (retrato) e 1.91:1 (paisagem)';
      }
      if (code === 100) {
        // code 100 = invalid parameter (not necessarily auth) — show the real message
        if (apiMsg) return apiMsg.length > 100 ? `${apiMsg.slice(0, 97)}...` : apiMsg;
      }
      if (apiMsg) error = apiMsg;
    } catch { /* ignore */ }
  }

  if (lower.includes('not a business') || lower.includes('not business') || lower.includes('creator')) {
    return 'A conta Instagram precisa ser do tipo Business ou Creator';
  }
  if (lower.includes('permission') || lower.includes('scope')) {
    return 'Permissão negada — reconecte a conta e aceite todas as permissões';
  }
  if (lower.includes('token') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'Token inválido — reconecte a conta';
  }
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429')) {
    return 'Limite de publicações atingido — tente mais tarde';
  }
  if (lower.includes('timeout') || lower.includes('network') || lower.includes('econnreset')) {
    return 'Erro de rede — tente novamente';
  }
  if (lower.includes('invalid user id') || lower.includes('collab')) {
    return 'Usuário do collab inválido ou conta não-business';
  }

  return error.length > 100 ? `${error.slice(0, 97)}...` : error;
}
