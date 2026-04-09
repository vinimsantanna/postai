import type { EvolutionWebhookEvent, ParsedMessage, MessageType, MessageKey } from '@/domain/types';

export function parsePhoneNumber(jid: string): string {
  // remoteJid format: "5573988548309@s.whatsapp.net"
  return jid.split('@')[0];
}

export function parseMessage(event: EvolutionWebhookEvent): ParsedMessage | null {
  const { data } = event;

  // Ignore messages sent by the bot itself
  if (data.key.fromMe) return null;

  // Only process incoming messages (Evolution API sends MESSAGES_UPSERT or messages.upsert)
  const normalizedEvent = (event.event ?? '').toUpperCase().replace('.', '_');
  if (normalizedEvent !== 'MESSAGES_UPSERT') return null;

  const from = parsePhoneNumber(data.key.remoteJid);
  const messageId = data.key.id;
  const timestamp = data.messageTimestamp ?? Math.floor(Date.now() / 1000);
  const msg = data.message;
  const messageKey: MessageKey = { remoteJid: data.key.remoteJid, fromMe: data.key.fromMe, id: messageId };

  if (!msg) return null;

  // Text message
  if (msg.conversation) {
    return { type: 'text', from, text: msg.conversation.trim(), messageId, timestamp };
  }

  // Image
  if (msg.imageMessage) {
    return {
      type: 'image',
      from,
      text: msg.imageMessage.caption?.trim(),
      mediaUrl: msg.imageMessage.url,
      mimeType: msg.imageMessage.mimetype,
      messageId,
      timestamp,
      messageKey,
      rawMessage: msg as Record<string, unknown>,
    };
  }

  // Video
  if (msg.videoMessage) {
    return {
      type: 'video',
      from,
      text: msg.videoMessage.caption?.trim(),
      mediaUrl: msg.videoMessage.url,
      mimeType: msg.videoMessage.mimetype,
      messageId,
      timestamp,
      messageKey,
      rawMessage: msg as Record<string, unknown>,
    };
  }

  // Audio
  if (msg.audioMessage) {
    return {
      type: 'audio',
      from,
      mediaUrl: msg.audioMessage.url,
      mimeType: msg.audioMessage.mimetype,
      messageId,
      timestamp,
      messageKey,
      rawMessage: msg as Record<string, unknown>,
    };
  }

  // Document
  if (msg.documentMessage) {
    return {
      type: 'document',
      from,
      text: msg.documentMessage.title,
      mediaUrl: msg.documentMessage.url,
      mimeType: msg.documentMessage.mimetype,
      messageId,
      timestamp,
      messageKey,
      rawMessage: msg as Record<string, unknown>,
    };
  }

  // Button response
  if (msg.buttonsResponseMessage) {
    return {
      type: 'button',
      from,
      text: msg.buttonsResponseMessage.selectedButtonId
        ?? msg.buttonsResponseMessage.selectedDisplayText
        ?? '',
      messageId,
      timestamp,
    };
  }

  return { type: 'unknown' as MessageType, from, messageId, timestamp };
}
