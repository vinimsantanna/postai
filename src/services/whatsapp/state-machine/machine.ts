import type { WhatsappSession, User } from '@prisma/client';
import type { ParsedMessage, ConversationState, CampaignDraft } from '@/domain/types';
import { sessionRepository } from '@/repositories/session.repository';
import { whatsappService } from '@/services/whatsapp/whatsapp.service';
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

  switch (input) {
    case '1':
      await transitionTo(session, 'waiting_copy', {});
      await whatsappService.sendText(message.from, MESSAGES.ASK_COPY);
      break;
    case '2':
      await transitionTo(session, 'waiting_schedule', {});
      await whatsappService.sendText(message.from, MESSAGES.ASK_SCHEDULED_COPY);
      break;
    case '3':
      await transitionTo(session, 'history', null);
      await whatsappService.sendText(message.from, MESSAGES.HISTORY_LOADING);
      // History lookup happens here — simplified for MVP
      await whatsappService.sendText(message.from, MESSAGES.HISTORY_EMPTY);
      await transitionTo(session, 'menu', null);
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
      break;
    default:
      await whatsappService.sendText(message.from, MENU_TEXT(session.user.name));
  }
}

async function handleSelectClient(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  // Agency client selection — simplified: expects client number
  const input = message.text?.trim() ?? '';
  if (/^\d+$/.test(input)) {
    // Would look up client by index from agency client list
    await transitionTo(session, 'waiting_copy', draft);
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
  const newDraft = { ...draft, videoUrl: message.mediaUrl };
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
    newDraft = { ...draft, thumbnailUrl: message.mediaUrl };
  }
  // "pular" or any text = skip thumbnail
  await transitionTo(session, 'confirm_publish', newDraft);
  await whatsappService.sendText(message.from, confirmMessage(newDraft));
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

async function handleConfirmPublish(
  session: SessionWithUser,
  message: ParsedMessage,
  draft: CampaignDraft,
): Promise<void> {
  const input = (message.text ?? '').toLowerCase().trim();

  if (input === 'confirmar' || input === 'ok' || input === 'sim' || input === '1') {
    await transitionTo(session, 'menu', null);
    await whatsappService.sendText(message.from, MESSAGES.PUBLISHING_STARTED);
    // n8n webhook call happens via campaign service (not here)
    // The controller layer handles campaign creation + n8n dispatch
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
