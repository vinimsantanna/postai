import axios from 'axios';
import { supabaseStorage } from '@/lib/supabase';
import type { MessageKey } from '@/domain/types';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL ?? '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'postai';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? '';

/**
 * Fetches media from Evolution API decryption endpoint and re-hosts on Supabase Storage.
 * Used when webhookBase64=false (CDN URLs are encrypted and cannot be downloaded directly).
 */
async function fetchViaDecryptionEndpoint(
  messageKey: MessageKey,
  rawMessage: Record<string, unknown>,
  type: 'video' | 'image',
): Promise<Buffer> {
  const url = `${EVOLUTION_BASE_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`;
  const body = {
    message: {
      key: messageKey,
      message: rawMessage,
    },
    convertToMp4: false,
  };

  const response = await axios.post<{ base64: string; mediaType: string }>(url, body, {
    headers: { apikey: EVOLUTION_API_KEY },
    timeout: 120_000,
  });

  const base64 = response.data?.base64;
  if (!base64) throw new Error(`[media-handler] Evolution API returned no base64 for ${type}`);

  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(raw, 'base64');
}

/**
 * Downloads media and re-hosts on Supabase Storage (permanent URL).
 *
 * Priority:
 *   1. messageKey + rawMessage → Evolution API decryption endpoint (webhookBase64=false)
 *   2. data: URL → inline base64 from webhook (webhookBase64=true)
 *   3. http URL → direct CDN download (fallback, may fail if encrypted)
 */
export async function persistMedia(
  mediaUrl: string,
  userId: string,
  type: 'video' | 'image',
  messageId: string,
  messageKey?: MessageKey,
  rawMessage?: Record<string, unknown>,
): Promise<string> {
  const ext = type === 'video' ? 'mp4' : 'jpg';
  const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  const path = `${type}s/${userId}/${Date.now()}-${messageId}.${ext}`;

  let buffer: Buffer;

  if (messageKey && rawMessage) {
    buffer = await fetchViaDecryptionEndpoint(messageKey, rawMessage, type);
  } else if (mediaUrl.startsWith('data:')) {
    const base64Data = mediaUrl.split(',')[1];
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    const response = await axios.get<Buffer>(mediaUrl, {
      responseType: 'arraybuffer',
      headers: EVOLUTION_API_KEY ? { apikey: EVOLUTION_API_KEY } : {},
      timeout: 120_000,
      maxContentLength: 500 * 1024 * 1024,
    });
    buffer = Buffer.from(response.data);
  }

  const publicUrl = await supabaseStorage.upload(path, buffer, contentType);
  return publicUrl;
}
