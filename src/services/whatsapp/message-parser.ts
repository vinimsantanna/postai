import type { EvolutionWebhookEvent, ParsedMessage, MessageType } from '@/domain/types';

export function parsePhoneNumber(jid: string): string {
  return jid.split('@')[0];
}

/**
 * Evolution API serializes mediaKey in three possible formats:
 *   1. base64 string                    — ideal, use directly
 *   2. {type:'Buffer', data:[...]}      — Node.js Buffer JSON.stringify output
 *   3. {"0":117,"1":208,...}            — Uint8Array serialized via JSON (numeric string keys)
 */
function normalizeMediaKey(key: unknown): string | undefined {
  if (!key) return undefined;
  if (typeof key === 'string') return key;
  if (typeof key === 'object' && key !== null) {
    const obj = key as Record<string, unknown>;
    // Format 2: {type:'Buffer', data:[...]}
    if (obj['type'] === 'Buffer' && Array.isArray(obj['data'])) {
      return Buffer.from(obj['data'] as number[]).toString('base64');
    }
    // Format 3: {"0":117,"1":208,...} — all values are numbers
    const values = Object.values(obj);
    if (values.length > 0 && values.every((v) => typeof v === 'number')) {
      return Buffer.from(values as number[]).toString('base64');
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

  if (msg.imageMessage) {
    const mediaUrl = resolveMediaUrl(msg.imageMessage.url, msg.imageMessage.mimetype);
    return {
      type: 'image', from,
      text: msg.imageMessage.caption?.trim(),
      mediaUrl, mimeType: msg.imageMessage.mimetype,
      messageId, timestamp,
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.imageMessage.mediaKey),
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
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.videoMessage.mediaKey),
      whatsappMediaType: 'video',
    };
  }

  if (msg.audioMessage) {
    const mediaUrl = resolveMediaUrl(msg.audioMessage.url, msg.audioMessage.mimetype);
    return {
      type: 'audio', from,
      mediaUrl, mimeType: msg.audioMessage.mimetype,
      messageId, timestamp,
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.audioMessage.mediaKey),
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
      mediaKey: mediaUrl?.startsWith('data:') ? undefined : normalizeMediaKey(msg.documentMessage.mediaKey),
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
