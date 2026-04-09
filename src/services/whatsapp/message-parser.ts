import type { EvolutionWebhookEvent, ParsedMessage, MessageType } from '@/domain/types';

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

  if (!msg) return null;

  // Text message
  if (msg.conversation) {
    return { type: 'text', from, text: msg.conversation.trim(), messageId, timestamp };
  }

  // When webhookBase64=true, base64 is at data.base64 or inside the message object
  const base64 =
    data.base64 ??
    msg.imageMessage?.base64 ??
    msg.videoMessage?.base64 ??
    msg.audioMessage?.base64 ??
    msg.documentMessage?.base64;

  // mediaUrl: prefer base64 data URL (no decryption needed), fall back to CDN URL
  function mediaUrl(cdnUrl?: string, mimetype?: string): string | undefined {
    if (base64) {
      const raw = base64.includes(',') ? base64 : `data:${mimetype ?? 'application/octet-stream'};base64,${base64}`;
      return raw;
    }
    return cdnUrl;
  }

  // Image
  if (msg.imageMessage) {
    return {
      type: 'image',
      from,
      text: msg.imageMessage.caption?.trim(),
      mediaUrl: mediaUrl(msg.imageMessage.url, msg.imageMessage.mimetype),
      mimeType: msg.imageMessage.mimetype,
      messageId,
      timestamp,
    };
  }

  // Video
  if (msg.videoMessage) {
    return {
      type: 'video',
      from,
      text: msg.videoMessage.caption?.trim(),
      mediaUrl: mediaUrl(msg.videoMessage.url, msg.videoMessage.mimetype),
      mimeType: msg.videoMessage.mimetype,
      messageId,
      timestamp,
    };
  }

  // Audio
  if (msg.audioMessage) {
    return {
      type: 'audio',
      from,
      mediaUrl: mediaUrl(msg.audioMessage.url, msg.audioMessage.mimetype),
      mimeType: msg.audioMessage.mimetype,
      messageId,
      timestamp,
    };
  }

  // Document
  if (msg.documentMessage) {
    return {
      type: 'document',
      from,
      text: msg.documentMessage.title,
      mediaUrl: mediaUrl(msg.documentMessage.url, msg.documentMessage.mimetype),
      mimeType: msg.documentMessage.mimetype,
      messageId,
      timestamp,
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
