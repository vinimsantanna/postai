import type { WhatsappSession, User } from '@prisma/client';
import type { ParsedMessage, ConversationState, CampaignDraft } from '@/domain/types';
import { sessionRepository } from '@/repositories/session.repository';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
import { persistMedia } from '@/services/whatsapp/media-handler';
import { runPublish } from '@/services/publishing/publisher.service';
import { retryFailedPlatforms } from '@/services/notifications/whatsapp-notifier';
import { parseDate, formatDate } from '@/services/whatsapp/date-parser';
import { schedulePost, cancelScheduledPost, listScheduledCampaigns } from '@/services/scheduling/scheduler.service';
import { campaignRepository } from '@/repositories/campaign.repository';
import type { Platform } from '@prisma/client';
import { MESSAGES, MENU_TEXT } from './messages';

type SessionWithUser = WhatsappSession & { user: User };

export async function processMessage(
  session: SessionWithUser,
  message: ParsedMessage,
): Promise<void> {
  const state = session.currentStep as ConversationState;
  const draft = (session.campaignDraft ?? {}) as CampaignDraft;

  switch (state) {
    case 'menu':
      await handleMenu(session, message, draft);
      break;
    case 'select_client':
      await handleSelectClient(session, message, draft);
      break;
    case 'waiting_copy':
      await handleWaitingCopy(session, message, draft);
      break;
    case 'waiting_video':
      await handleWaitingVideo(session, message, draft);
      break;
    case 'waiting_thumbnail':
      await handleWaitingThumbnail(session, message, draft);
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
    case 'history':
      await handleHistory(session, message);
      break;
    default:
      await transitionTo(session, 'menu', null);
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
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
    case '1':
      await transitionTo(session, 'waiting_copy', {});
      await whatsappService.sendText(message.from, MESSAGES.ASK_COPY);
      break;
    case '2':
      await transitionTo(session, 'waiting_schedule', { isScheduled: true });
      await whatsappService.sendText(message.from, MESSAGES.ASK_SCHEDULED_COPY);
      break;
    case '3': {
      await transitionTo(session, 'history', null);
      await whatsappService.sendText(message.from, MESSAGES.HISTORY_LOADING);
      const scheduled = await listScheduledCampaigns(session.userId);
      if (scheduled.length === 0) {
        await whatsappService.sendText(message.from, MESSAGES.HISTORY_EMPTY);
      } else {
        const lines = ['📅 *Posts agendados:*', ''];
        for (const s of scheduled) {
          const platformNames = s.platforms.join(', ');
          lines.push(`${s.index}. ${s.formattedDate} — ${platformNames}`);
        }
        lines.push('', 'Para cancelar: *cancelar 1* (ou o número do post)');
        await whatsappService.sendText(message.from, lines.join('\n'));
      }
      await transitionTo(session, 'menu', draft);
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
      break;
    }
    default:
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
  }
}

async function handleSelectClient(
  session: SessionWithUser,
  message: ParsedMessage,
  _draft: CampaignDraft,
): Promise<void> {
  // Agency client selection — simplified: expects client number
  const input = message.text?.trim() ?? '';
  if (/^\d+$/.test(input)) {
    // Would look up client by index from agency client list
    await transitionTo(session, 'waiting_copy', _draft);
    await whatsappService.sendText(message.from, MESSAGES.ASK_COPY);
  } else {
    await whatsappService.sendText(message.from, MESSAGES.SELECT_CLIENT_INVALID);
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
  await transitionTo(session, 'waiting_video', newDraft);
  await whatsappService.sendText(message.from, MESSAGES.ASK_VIDEO);
}

async function handleWaitingVideo(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  if (message.type !== 'video' || !message.mediaUrl) {
    await whatsappService.sendText(message.from, MESSAGES.VIDEO_REQUIRED);
    return;
  }
  await whatsappService.sendText(message.from, '⏳ Processando vídeo...');
  const permanentUrl = await persistMedia(
    message.mediaUrl,
    session.userId,
    'video',
    message.messageId,
  );
  const newDraft = { ...draft, videoUrl: permanentUrl };
  await transitionTo(session, 'waiting_thumbnail', newDraft);
  await whatsappService.sendText(message.from, MESSAGES.ASK_THUMBNAIL);
}

async function handleWaitingThumbnail(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  let newDraft = { ...draft };

  if (message.type === 'image' && message.mediaUrl) {
    const permanentUrl = await persistMedia(
      message.mediaUrl,
      session.userId,
      'image',
      message.messageId,
    );
    newDraft = { ...draft, thumbnailUrl: permanentUrl };
  }
  // "pular" or any text = skip thumbnail

  if (newDraft.isScheduled) {
    // Scheduled flow: ask for date next
    await transitionTo(session, 'waiting_schedule_date', newDraft);
    await whatsappService.sendText(message.from, MESSAGES.ASK_SCHEDULE_DATE);
  } else {
    await transitionTo(session, 'confirm_publish', newDraft);
    await whatsappService.sendText(message.from, confirmMessage(newDraft));
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
  await transitionTo(session, 'waiting_video', newDraft);
  await whatsappService.sendText(message.from, MESSAGES.ASK_VIDEO);
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
  await whatsappService.sendText(
    message.from,
    [
      `📋 *Confirme o agendamento:*`,
      '',
      `📝 *Legenda:* ${(draft.copy ?? '').slice(0, 80)}...`,
      `🎬 *Vídeo:* ✅`,
      `📅 *Data:* ${formatted}`,
      `📱 *Plataformas:* ${platforms}`,
      '',
      'Digite *confirmar* para agendar ou *cancelar* para desistir.',
    ].join('\n'),
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
      videoUrl: draft.videoUrl,
      thumbnailUrl: draft.thumbnailUrl,
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
    await transitionTo(session, 'menu', { lastCampaignId: campaign.id });
    await whatsappService.sendText(
      message.from,
      [
        `✅ *Agendado com sucesso!*`,
        '',
        `📅 ${formatted}`,
        `📱 Plataformas: ${platforms.join(', ')}`,
        '',
        `Para cancelar: acesse o menu e escolha *3* ou envie *cancelar 1*`,
      ].join('\n'),
    );
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
  } else if (input === 'cancelar' || input === 'não' || input === 'nao' || input === '2') {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, MESSAGES.PUBLISH_CANCELLED);
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
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

  if (input === 'confirmar' || input === 'ok' || input === 'sim' || input === '1') {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, MESSAGES.PUBLISHING_STARTED);
    // Fire-and-forget: publish runs in background, sends result when done
    runPublish(session.userId, message.from, draft, session.activeClientId ?? undefined).catch(
      (err) => console.error('[publisher] Unhandled error:', err),
    );
  } else if (input === 'cancelar' || input === 'não' || input === 'nao' || input === '2') {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, MESSAGES.PUBLISH_CANCELLED);
    await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
  } else {
    await whatsappService.sendText(message.from, confirmMessage(draft));
  }
}

async function handleHistory(
  _session: SessionWithUser,
  _message: ParsedMessage,
): Promise<void> {
  // handled in handleMenu case '3' — placeholder
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

function confirmMessage(draft: CampaignDraft): string {
  const platforms = draft.platforms?.join(', ') || 'Instagram, TikTok, LinkedIn, YouTube';
  return [
    '📋 *Confirme sua publicação:*',
    '',
    `📝 *Legenda:* ${draft.copy ?? '—'}`,
    `🎬 *Vídeo:* ${draft.videoUrl ? '✅ Enviado' : '—'}`,
    `🖼️ *Thumbnail:* ${draft.thumbnailUrl ? '✅ Enviada' : 'Não enviada'}`,
    `📱 *Plataformas:* ${platforms}`,
    draft.scheduledAt ? `⏰ *Agendado para:* ${draft.scheduledAt}` : '',
    '',
    'Digite *confirmar* para publicar ou *cancelar* para desistir.',
  ]
    .filter(Boolean)
    .join('\n');
}
