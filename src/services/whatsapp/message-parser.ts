import type { EvolutionWebhookEvent, ParsedMessage, MessageType } from '@/domain/types';

export function parsePhoneNumber(jid: string): string {
  return jid.split('@')[0];
}

export function parseMessage(event: EvolutionWebhookEvent): ParsedMessage | null {
  const { data } = event;

  if (data.key.fromMe) return null;

  const normalizedEvent = (event.event ?? '').toUpperCase().replace('.', '_');
  if (normalizedEvent !== 'MESSAGES_UPSERT') return null;

  const from = parsePhoneNumber(data.key.remoteJid);
  const messageId = data.key.id;
  const timestamp = data.messageTimestamp ?? Math.floor(Date.now() / 1000);
  const msg = data.message;

  if (!msg) return null;

  if (msg.conversation) {
    return { type: 'text', from, text: msg.conversation.trim(), messageId, timestamp };
  }

  // base64 inline from webhookBase64=true (preferred — no decryption needed)
  const inlineBase64 =
    data.base64 ??
    msg.imageMessage?.base64 ??
    msg.videoMessage?.base64 ??
    msg.audioMessage?.base64 ??
    msg.documentMessage?.base64;

  function resolveMediaUrl(cdnUrl?: string, mimetype?: string): string | undefined {
    if (inlineBase64) {
      return inlineBase64.includes(',')
        ? inlineBase64
        : `data:${mimetype ?? 'application/octet-stream'};base64,${inlineBase64}`;
    }
    return cdnUrl;
  }

  if (msg.imageMessage) {
    const mediaUrl = resolveMediaUrl(msg.imageMessage.url, msg.imageMessage.mimetype);
    return {
      type: 'image', from,
      text: msg.imageMessage.caption?.trim(),
      mediaUrl, mimeType: msg.imageMessage.mimetype,
      messageId, timestamp,
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : msg.imageMessage.mediaKey,
      whatsappMediaType: 'image',
    };
  }

  if (msg.videoMessage) {
    const mediaUrl = resolveMediaUrl(msg.videoMessage.url, msg.videoMessage.mimetype);
    return {
      type: 'video', from,
      text: msg.videoMessage.caption?.trim(),
      mediaUrl, mimeType: msg.videoMessage.mimetype,
      messageId, timestamp,
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : msg.videoMessage.mediaKey,
      whatsappMediaType: 'video',
    };
  }

  if (msg.audioMessage) {
    const mediaUrl = resolveMediaUrl(msg.audioMessage.url, msg.audioMessage.mimetype);
    return {
      type: 'audio', from,
      mediaUrl, mimeType: msg.audioMessage.mimetype,
      messageId, timestamp,
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : msg.audioMessage.mediaKey,
      whatsappMediaType: 'audio',
    };
  }

  if (msg.documentMessage) {
    const mediaUrl = resolveMediaUrl(msg.documentMessage.url, msg.documentMessage.mimetype);
    return {
      type: 'document', from,
      text: msg.documentMessage.title,
      mediaUrl, mimeType: msg.documentMessage.mimetype,
      messageId, timestamp,
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : msg.documentMessage.mediaKey,
      whatsappMediaType: 'document',
    };
  }

  if (msg.buttonsResponseMessage) {
    return {
      type: 'button', from,
      text: msg.buttonsResponseMessage.selectedButtonId
        ?? msg.buttonsResponseMessage.selectedDisplayText
        ?? '',
      messageId, timestamp,
    };
  }

  return { type: 'unknown' as MessageType, from, messageId, timestamp };
}
