import type { WhatsappSession, User, AgencyClient } from '@prisma/client';
import type { ParsedMessage, ConversationState, CampaignDraft } from '@/domain/types';
import { sessionRepository } from '@/repositories/session.repository';
import { agencyClientRepository } from '@/repositories/agency-client.repository';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { persistMedia } from '@/services/whatsapp/media-handler';
import { runPublish } from '@/services/publishing/publisher.service';
import { retryFailedPlatforms } from '@/services/notifications/whatsapp-notifier';
import { parseDate, formatDate } from '@/services/whatsapp/date-parser';
import { schedulePost, cancelScheduledPost, listScheduledCampaigns } from '@/services/scheduling/scheduler.service';
import { campaignRepository } from '@/repositories/campaign.repository';
import type { Platform } from '@prisma/client';
import prisma from '@/lib/prisma';
import { MESSAGES, MENU_TEXT } from './messages';

async function getConnectedPlatforms(userId: string, clientId?: string | null): Promise<Platform[]> {
  const tokens = await prisma.apiToken.findMany({
    where: {
      userId,
      clientId: clientId ?? null,
      deletedAt: null,
    },
    select: { platform: true },
  });
  return tokens.map((t) => t.platform);
}

type SessionWithUser = WhatsappSession & { user: User; activeClient: AgencyClient | null };

export async function processMessage(
  session: SessionWithUser,
  message: ParsedMessage,
): Promise<void> {
  const state = session.currentStep as ConversationState;
  const draft = (session.campaignDraft ?? {}) as CampaignDraft;
  const isAgency = session.user.plan === 'AGENCY_SYMPHONY';

  // Global escape commands — work in any state
  const input = (message.text ?? '').trim().toLowerCase();
  if (state !== 'menu' && (input === 'menu' || input === 'voltar' || input === 'cancelar' || input === 'sair')) {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, '↩️ Operação cancelada.');
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, isAgency));
    return;
  }

  switch (state) {
    case 'menu':
      await handleMenu(session, message, draft);
      break;
    case 'select_client':
      await handleSelectClient(session, message, draft);
      break;
    case 'create_client_name':
      await handleCreateClientName(session, message, draft);
      break;
    case 'create_client_confirm':
      await handleCreateClientConfirm(session, message, draft);
      break;
    case 'waiting_copy':
      await handleWaitingCopy(session, message, draft);
      break;
    case 'waiting_media_type':
      await handleWaitingMediaType(session, message, draft);
      break;
    case 'waiting_video':
      await handleWaitingVideo(session, message, draft);
      break;
    case 'waiting_photo':
      await handleWaitingPhoto(session, message, draft);
      break;
    case 'waiting_cover_photo':
      await handleWaitingCoverPhoto(session, message, draft);
      break;
    case 'waiting_schedule':
      await handleWaitingSchedule(session, message, draft);
      break;
    case 'waiting_schedule_date':
      await handleWaitingScheduleDate(session, message, draft);
      break;
    case 'confirm_schedule':
      await handleConfirmSchedule(session, message, draft);
      break;
    case 'confirm_publish':
      await handleConfirmPublish(session, message, draft);
      break;
    default:
      await transitionTo(session, 'menu', null);
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, session.user.plan === 'AGENCY_SYMPHONY'));
  }
}

// ============================================================
// State handlers
// ============================================================

async function handleMenu(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const input = message.text?.trim() ?? '';

  const isAgency = session.user.plan === 'AGENCY_SYMPHONY';

  // "trocar cliente" command — reset to client selection
  if (isAgency && (input === 'trocar cliente' || input === 'trocar' || input === '0')) {
    const clients = await agencyClientRepository.findByUser(session.userId);
    await sessionRepository.updateActiveClient(session.id, null);
    await transitionTo(session, 'select_client', null);
    if (clients.length === 0) {
      await whatsappService.sendText(message.from, MESSAGES.NO_CLIENTS_ONBOARD);
      return;
    }
    const clientList = clients.map((c, i) => ({
      index: i + 1,
      name: c.name,
      platforms: c.tokens.map((t) => t.platform as string),
    }));
    await whatsappService.sendText(message.from, MESSAGES.SELECT_CLIENT_PROMPT(clientList));
    return;
  }

  // "cancelar N" command — cancel scheduled post by index
  const cancelMatch = input.match(/^cancelar\s+(\d+)$/i);
  if (cancelMatch) {
    const index = parseInt(cancelMatch[1], 10);
    const scheduled = await listScheduledCampaigns(session.userId);
    const target = scheduled.find((s) => s.index === index);
    if (!target) {
      await whatsappService.sendText(message.from, `❌ Agendamento ${index} não encontrado.`);
    } else {
      const removed = await cancelScheduledPost(target.campaignId);
      if (removed) {
        await campaignRepository.setResults(target.campaignId, {}, 'CANCELLED');
        await whatsappService.sendText(
          message.from,
          `✅ Agendamento do ${target.formattedDate} cancelado.`,
        );
      } else {
        await whatsappService.sendText(message.from, '❌ Não foi possível cancelar. O post pode já ter sido publicado.');
      }
    }
    return;
  }

  // "retentar" command — re-publish only failed platforms from last campaign
  if (input === 'retentar' || input === 'retry') {
    const lastCampaignId = draft.lastCampaignId;
    if (!lastCampaignId) {
      await whatsappService.sendText(message.from, '❌ Nenhuma publicação recente encontrada para retentar.');
      return;
    }
    await retryFailedPlatforms(
      lastCampaignId,
      session.userId,
      message.from,
      session.activeClientId ?? undefined,
    ).catch((err) => console.error('[retentar] error:', err));
    return;
  }

  switch (input) {
    case '1': {
      const platforms = await getConnectedPlatforms(session.userId, session.activeClientId);
      if (platforms.length === 0) {
        await whatsappService.sendText(message.from, '❌ Nenhuma rede social conectada. Acesse o painel para conectar suas contas antes de publicar.');
        return;
      }
      await transitionTo(session, 'waiting_copy', { platforms });
      await whatsappService.sendText(message.from, MESSAGES.ASK_COPY);
      break;
    }
    case '2': {
      const platforms = await getConnectedPlatforms(session.userId, session.activeClientId);
      if (platforms.length === 0) {
        await whatsappService.sendText(message.from, '❌ Nenhuma rede social conectada. Acesse o painel para conectar suas contas antes de publicar.');
        return;
      }
      await transitionTo(session, 'waiting_schedule', { isScheduled: true, platforms });
      await whatsappService.sendText(message.from, MESSAGES.ASK_SCHEDULED_COPY);
      break;
    }
    case '3': {
      await whatsappService.sendText(message.from, MESSAGES.HISTORY_LOADING);
      const [recent, scheduled] = await Promise.all([
        campaignRepository.findRecentPublished(session.userId),
        listScheduledCampaigns(session.userId),
      ]);

      if (recent.length === 0 && scheduled.length === 0) {
        await whatsappService.sendText(message.from, MESSAGES.HISTORY_EMPTY);
      } else {
        const lines: string[] = ['📊 *Histórico de publicações:*', ''];

        if (recent.length > 0) {
          lines.push('*Recentes:*');
          for (const c of recent) {
            const icon = c.status === 'PUBLISHED' ? '✅' : c.status === 'PARTIAL_FAILURE' ? '⚠️' : '❌';
            const platforms = (c.platforms as Platform[]).join(', ');
            const date = formatDate(c.publishedAt ?? c.createdAt);
            lines.push(`${icon} ${date} — ${platforms}`);
          }
        }

        if (scheduled.length > 0) {
          if (recent.length > 0) lines.push('');
          lines.push('*Agendados:*');
          for (const s of scheduled) {
            lines.push(`${s.index}. ${s.formattedDate} — ${s.platforms.join(', ')}`);
          }
          lines.push('', 'Para cancelar: *cancelar 1* (ou o número do agendamento)');
        }

        await whatsappService.sendText(message.from, lines.join('\n'));
      }

      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, session.user.plan === 'AGENCY_SYMPHONY'));
      break;
    }
    default:
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, isAgency));
  }
}

async function handleSelectClient(
  session: SessionWithUser,
  message: ParsedMessage,
  _draft: CampaignDraft,
): Promise<void> {
  const clients = await agencyClientRepository.findByUser(session.userId);

  if (clients.length === 0) {
    await transitionTo(session, 'create_client_name', {});
    await whatsappService.sendText(message.from, MESSAGES.NO_CLIENTS_ONBOARD);
    return;
  }

  const input = message.text?.trim() ?? '';
  const index = parseInt(input, 10);

  if (!Number.isInteger(index) || index < 1 || index > clients.length) {
    const clientList = clients.map((c, i) => ({
      index: i + 1,
      name: c.name,
      platforms: c.tokens.map((t) => t.platform as string),
    }));
    await whatsappService.sendText(message.from, MESSAGES.SELECT_CLIENT_PROMPT(clientList));
    return;
  }

  const client = clients[index - 1];
  await sessionRepository.updateActiveClient(session.id, client.id);
  await transitionTo(session, 'menu', {});

  const platforms = client.tokens.map((t) => t.platform as string);
  await whatsappService.sendText(message.from, MESSAGES.CLIENT_SELECTED(client.name, platforms));
  await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, true));
}

async function handleCreateClientName(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const name = message.text?.trim() ?? '';
  if (name.length < 2) {
    await whatsappService.sendText(message.from, '❌ Nome muito curto. Como se chama o cliente?');
    return;
  }
  await transitionTo(session, 'create_client_confirm', { ...draft, copy: name });
  await whatsappService.sendText(message.from, MESSAGES.CREATE_CLIENT_CONFIRM(name));
}

async function handleCreateClientConfirm(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const input = (message.text ?? '').toLowerCase().trim();
  const name = draft.copy ?? '';

  if (input === 'confirmar' || input === 'sim' || input === 'ok') {
    await agencyClientRepository.create({ agencyUserId: session.userId, name });
    await whatsappService.sendText(message.from, MESSAGES.CREATE_CLIENT_SUCCESS(name));

    // Reload clients and go to select
    const clients = await agencyClientRepository.findByUser(session.userId);
    const clientList = clients.map((c, i) => ({
      index: i + 1,
      name: c.name,
      platforms: c.tokens.map((t) => t.platform as string),
    }));
    await transitionTo(session, 'select_client', {});
    await whatsappService.sendText(message.from, MESSAGES.SELECT_CLIENT_PROMPT(clientList));
  } else if (input === 'cancelar' || input === 'não' || input === 'nao') {
    await transitionTo(session, 'create_client_name', {});
    await whatsappService.sendText(message.from, MESSAGES.NO_CLIENTS_ONBOARD);
  } else {
    await whatsappService.sendText(message.from, MESSAGES.CREATE_CLIENT_CONFIRM(name));
  }
}

async function handleWaitingCopy(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  if (!message.text || message.text.length < 3) {
    await whatsappService.sendText(message.from, MESSAGES.COPY_TOO_SHORT);
    return;
  }
  const newDraft = { ...draft, copy: message.text };
  await transitionTo(session, 'waiting_media_type', newDraft);
  await whatsappService.sendText(message.from, MESSAGES.ASK_MEDIA_TYPE);
}

async function handleWaitingMediaType(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const input = message.text?.trim() ?? '';
  if (input === '1') {
    const newDraft = { ...draft, mediaType: 'video' as const };
    await transitionTo(session, 'waiting_video', newDraft);
    await whatsappService.sendText(message.from, MESSAGES.ASK_VIDEO);
  } else if (input === '2') {
    const newDraft = { ...draft, mediaType: 'photo' as const };
    await transitionTo(session, 'waiting_photo', newDraft);
    await whatsappService.sendText(message.from, MESSAGES.ASK_PHOTO);
  } else {
    await whatsappService.sendText(message.from, MESSAGES.MEDIA_TYPE_INVALID);
  }
}

async function handleWaitingVideo(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const isVideoDocument = message.type === 'document' && message.mimeType?.startsWith('video/');
  if ((message.type !== 'video' && !isVideoDocument) || !message.mediaUrl) {
    await whatsappService.sendText(message.from, MESSAGES.VIDEO_REQUIRED);
    return;
  }
  await whatsappService.sendText(message.from, MESSAGES.VIDEO_LARGE_WARNING);
  const permanentUrl = await persistMedia(
    message.mediaUrl,
    session.userId,
    'video',
    message.messageId,
    message.mediaKey,
    message.whatsappMediaType,
    message.remoteJid,
    message.rawMessageContent,
  );
  const newDraft = { ...draft, videoUrl: permanentUrl };
  await transitionTo(session, 'waiting_cover_photo', newDraft);
  await whatsappService.sendText(message.from, MESSAGES.ASK_COVER_PHOTO);
}

async function handleWaitingPhoto(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const isImageDocument = message.type === 'document' && message.mimeType?.startsWith('image/');
  if ((message.type !== 'image' && !isImageDocument) || !message.mediaUrl) {
    await whatsappService.sendText(message.from, MESSAGES.PHOTO_REQUIRED);
    return;
  }
  const permanentUrl = await persistMedia(
    message.mediaUrl,
    session.userId,
    'image',
    message.messageId,
    message.mediaKey,
    message.whatsappMediaType,
    message.remoteJid,
    message.rawMessageContent,
  );
  const newDraft = { ...draft, photoUrl: permanentUrl };

  if (newDraft.isScheduled) {
    await transitionTo(session, 'waiting_schedule_date', newDraft);
    await whatsappService.sendText(message.from, MESSAGES.ASK_SCHEDULE_DATE);
  } else {
    await transitionTo(session, 'confirm_publish', newDraft);
    await whatsappService.sendText(message.from, confirmMessage(newDraft, session.activeClient?.name));
  }
}

async function handleWaitingCoverPhoto(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  let newDraft = { ...draft };

  const isImageDocument = message.type === 'document' && message.mimeType?.startsWith('image/');
  if ((message.type === 'image' || isImageDocument) && message.mediaUrl) {
    const permanentUrl = await persistMedia(
      message.mediaUrl,
      session.userId,
      'image',
      message.messageId,
      message.mediaKey,
      message.whatsappMediaType,
      message.remoteJid,
      message.rawMessageContent,
    );
    newDraft = { ...draft, coverPhotoUrl: permanentUrl };
  }
  // any text (including "pular") = skip cover photo

  if (newDraft.isScheduled) {
    await transitionTo(session, 'waiting_schedule_date', newDraft);
    await whatsappService.sendText(message.from, MESSAGES.ASK_SCHEDULE_DATE);
  } else {
    await transitionTo(session, 'confirm_publish', newDraft);
    await whatsappService.sendText(message.from, confirmMessage(newDraft, session.activeClient?.name));
  }
}

async function handleWaitingSchedule(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  if (!message.text || message.text.length < 3) {
    await whatsappService.sendText(message.from, MESSAGES.COPY_TOO_SHORT);
    return;
  }
  const newDraft = { ...draft, copy: message.text };
  await transitionTo(session, 'waiting_media_type', newDraft);
  await whatsappService.sendText(message.from, MESSAGES.ASK_MEDIA_TYPE);
}

async function handleWaitingScheduleDate(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  if (!message.text) {
    await whatsappService.sendText(message.from, MESSAGES.INVALID_DATE);
    return;
  }

  const date = parseDate(message.text);
  if (!date) {
    await whatsappService.sendText(message.from, MESSAGES.INVALID_DATE);
    return;
  }

  const newDraft = { ...draft, scheduledAt: date.toISOString() };
  await transitionTo(session, 'confirm_schedule', newDraft);

  const formatted = formatDate(date);
  const platforms = (draft.platforms ?? ['Instagram', 'TikTok', 'LinkedIn', 'YouTube']).join(', ');
  const clientName = session.activeClient?.name;
  await whatsappService.sendText(
    message.from,
    [
      `📋 *Confirme o agendamento:*`,
      '',
      clientName ? `👤 *Cliente:* ${clientName}` : '',
      `📝 *Legenda:* ${(draft.copy ?? '').slice(0, 80)}...`,
      `🎬 *Vídeo:* ✅`,
      `📅 *Data:* ${formatted}`,
      `📱 *Plataformas:* ${platforms}`,
      '',
      'Digite *confirmar* para agendar ou *cancelar* para desistir.',
    ].filter(Boolean).join('\n'),
  );
}

async function handleConfirmSchedule(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const input = (message.text ?? '').toLowerCase().trim();

  if (input === 'confirmar' || input === 'ok' || input === 'sim' || input === '1') {
    if (!draft.scheduledAt) {
      await transitionTo(session, 'menu', null);
      await whatsappService.sendText(message.from, MESSAGES.ERROR_GENERAL);
      return;
    }

    const scheduledAt = new Date(draft.scheduledAt);
    const platforms = (draft.platforms ?? ['INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'YOUTUBE']) as Platform[];

    // Create campaign with SCHEDULED status
    const campaign = await campaignRepository.create({
      userId: session.userId,
      clientId: session.activeClientId ?? undefined,
      copy: draft.copy ?? '',
      videoUrl: draft.videoUrl ?? draft.photoUrl,
      thumbnailUrl: draft.coverPhotoUrl,
      platforms,
      scheduledAt,
    });

    // Update status to SCHEDULED
    await campaignRepository.setResults(campaign.id, {}, 'SCHEDULED');

    // Create BullMQ delayed job
    await schedulePost({
      campaignId: campaign.id,
      userId: session.userId,
      phoneNumber: message.from,
      scheduledAt,
      clientId: session.activeClientId ?? undefined,
    });

    const formatted = formatDate(scheduledAt);
    const clientName = session.activeClient?.name;
    const isAgency = session.user.plan === 'AGENCY_SYMPHONY';
    await transitionTo(session, 'menu', { lastCampaignId: campaign.id });
    await whatsappService.sendText(
      message.from,
      [
        `✅ *Agendado com sucesso!*`,
        '',
        clientName ? `👤 *Cliente:* ${clientName}` : '',
        `📅 ${formatted}`,
        `📱 Plataformas: ${platforms.join(', ')}`,
        '',
        `Para cancelar: acesse o menu e escolha *3* ou envie *cancelar 1*`,
      ].filter(Boolean).join('\n'),
    );
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, isAgency));
  } else if (input === 'cancelar' || input === 'não' || input === 'nao' || input === '2') {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, MESSAGES.PUBLISH_CANCELLED);
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, session.user.plan === 'AGENCY_SYMPHONY'));
  } else {
    // Resend confirmation
    await handleWaitingScheduleDate(session, { ...message, text: draft.scheduledAt }, draft);
  }
}

async function handleConfirmPublish(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const input = (message.text ?? '').toLowerCase().trim();
  const isAgency = session.user.plan === 'AGENCY_SYMPHONY';
  const clientName = session.activeClient?.name;

  const isConfirm = input === 'confirmar' || input === 'ok' || input === 'sim' || input === '1';
  const isConfirmWithStories = input === 'stories' || input === 'confirmar + stories';

  if (isConfirm || isConfirmWithStories) {
    const finalDraft = isConfirmWithStories ? { ...draft, withStories: true } : draft;
    await transitionTo(session, 'menu', null);
    const publishingMsg = clientName
      ? `🚀 *Publicando como: ${clientName}!*\n\nPublicando em todas as redes agora. Você receberá os links em breve!`
      : MESSAGES.PUBLISHING_STARTED;
    await whatsappService.sendText(message.from, publishingMsg);
    runPublish(session.userId, message.from, finalDraft, session.activeClientId ?? undefined).catch(
      (err) => console.error('[publisher] Unhandled error:', err),
    );
  } else if (input === 'cancelar' || input === 'não' || input === 'nao' || input === '2') {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, MESSAGES.PUBLISH_CANCELLED);
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name, isAgency));
  } else {
    await whatsappService.sendText(message.from, confirmMessage(draft, clientName));
  }
}

// ============================================================
// Helpers
// ============================================================

async function transitionTo(
  session: WhatsappSession,
  state: ConversationState,
  draft: CampaignDraft | null,
): Promise<void> {
  await sessionRepository.updateStep(session.id, state, draft);
}

function confirmMessage(draft: CampaignDraft, clientName?: string): string {
  const platforms = draft.platforms?.join(', ') || 'Instagram, TikTok, LinkedIn, YouTube';
  const isVideo = draft.mediaType === 'video' || draft.videoUrl;
  const mediaLine = isVideo
    ? `🎬 *Vídeo:* ${draft.videoUrl ? '✅ Enviado' : '—'}`
    : `📸 *Foto:* ${draft.photoUrl ? '✅ Enviada' : '—'}`;
  const coverLine = isVideo
    ? `🖼️ *Foto de capa:* ${draft.coverPhotoUrl ? '✅ Enviada' : 'Não enviada'}`
    : '';

  const hasInstagram = draft.platforms?.some((p) => p === 'INSTAGRAM');

  return [
    '📋 *Confirme sua publicação:*',
    '',
    clientName ? `👤 *Cliente:* ${clientName}` : '',
    `📝 *Legenda:* ${draft.copy ?? '—'}`,
    mediaLine,
    coverLine,
    `📱 *Plataformas:* ${platforms}`,
    draft.scheduledAt ? `⏰ *Agendado para:* ${draft.scheduledAt}` : '',
    '',
    'Digite *confirmar* para publicar',
    hasInstagram ? 'Digite *stories* para publicar + Story no Instagram' : '',
    'Digite *cancelar* para desistir',
  ]
    .filter(Boolean)
    .join('\n');
}
