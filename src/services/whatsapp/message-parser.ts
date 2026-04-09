import type { EvolutionWebhookEvent, ParsedMessage, MessageType } from '@/domain/types';

export function parsePhoneNumber(jid: string): string {
  return jid.split('@')[0];
}

/**
 * Evolution API can send mediaKey as a base64 string OR as a serialized Buffer
 * object {type:'Buffer', data:[...]}. Normalize to base64 string.
 */
function normalizeMediaKey(key: unknown): string | undefined {
  if (!key) return undefined;
  if (typeof key === 'string') return key;
  if (typeof key === 'object' && key !== null) {
    const obj = key as Record<string, unknown>;
    if (obj['type'] === 'Buffer' && Array.isArray(obj['data'])) {
      return Buffer.from(obj['data'] as number[]).toString('base64');
    }
  }
  return undefined;
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

  const remoteJid = data.key.remoteJid;

  if (msg.imageMessage) {
    const mediaUrl = resolveMediaUrl(msg.imageMessage.url, msg.imageMessage.mimetype);
    const mediaKey = mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.imageMessage.mediaKey);
    return {
      type: 'image', from, remoteJid,
      text: msg.imageMessage.caption?.trim(),
      mediaUrl, mimeType: msg.imageMessage.mimetype,
      messageId, timestamp,
      mediaKey, whatsappMediaType: 'image',
      rawMessageContent: mediaKey ? undefined : msg.imageMessage,
    };
  }

  if (msg.videoMessage) {
    const mediaUrl = resolveMediaUrl(msg.videoMessage.url, msg.videoMessage.mimetype);
    const mediaKey = mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.videoMessage.mediaKey);
    return {
      type: 'video', from, remoteJid,
      text: msg.videoMessage.caption?.trim(),
      mediaUrl, mimeType: msg.videoMessage.mimetype,
      messageId, timestamp,
      mediaKey, whatsappMediaType: 'video',
      rawMessageContent: mediaKey ? undefined : msg.videoMessage,
    };
  }

  if (msg.audioMessage) {
    const mediaUrl = resolveMediaUrl(msg.audioMessage.url, msg.audioMessage.mimetype);
    const mediaKey = mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.audioMessage.mediaKey);
    return {
      type: 'audio', from, remoteJid,
      mediaUrl, mimeType: msg.audioMessage.mimetype,
      messageId, timestamp,
      mediaKey, whatsappMediaType: 'audio',
      rawMessageContent: mediaKey ? undefined : msg.audioMessage,
    };
  }

  if (msg.documentMessage) {
    const mediaUrl = resolveMediaUrl(msg.documentMessage.url, msg.documentMessage.mimetype);
    const mediaKey = mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.documentMessage.mediaKey);
    return {
      type: 'document', from, remoteJid,
      text: msg.documentMessage.title,
      mediaUrl, mimeType: msg.documentMessage.mimetype,
      messageId, timestamp,
      mediaKey, whatsappMediaType: 'document',
      rawMessageContent: mediaKey ? undefined : msg.documentMessage,
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
