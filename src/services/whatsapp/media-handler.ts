import axios from 'axios';
import { supabaseStorage } from '@/lib/supabase';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL ?? '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'postai';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? '';

/**
 * Uploads media to permanent storage (Cloudinary for video, Supabase for images).
 *
 * mediaUrl can be:
 *   - data:<mimetype>;base64,<data>  — from webhookBase64=true (preferred, no decryption)
 *   - https://mmg.whatsapp.net/...   — encrypted CDN URL (needs decryption via Evolution API)
 */
export async function persistMedia(
  mediaUrl: string,
  userId: string,
  type: 'video' | 'image',
  messageId: string,
  rawMessage?: Record<string, unknown>,
): Promise<string> {
  const ext = type === 'video' ? 'mp4' : 'jpg';
  const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  const path = `${type}s/${userId}/${Date.now()}-${messageId}.${ext}`;

  let buffer: Buffer;

  if (mediaUrl.startsWith('data:')) {
    // Base64 inline — no decryption needed
    const base64Data = mediaUrl.split(',')[1];
    if (!base64Data) throw new Error('[media-handler] Empty base64 data');
    buffer = Buffer.from(base64Data, 'base64');
    console.log('[media-handler] base64 inline, size:', buffer.length, 'bytes');
  } else if (rawMessage) {
    // CDN URL (encrypted) — decrypt via Evolution API
    console.log('[media-handler] CDN URL, trying Evolution API decryption...');
    buffer = await decryptViaEvolutionApi(rawMessage);
    console.log('[media-handler] decrypted, size:', buffer.length, 'bytes');
  } else {
    throw new Error('[media-handler] Cannot fetch media: no base64 and no rawMessage for decryption');
  }

  return supabaseStorage.upload(path, buffer, contentType);
}

async function decryptViaEvolutionApi(rawMessage: Record<string, unknown>): Promise<Buffer> {
  const url = `${EVOLUTION_BASE_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`;

  // Log the keys present so we can see if mediaKey/fileEncSha256 are included
  const msgContent = rawMessage.message as Record<string, unknown> | undefined;
  const mediaFields = Object.keys(msgContent ?? {});
  const innerFields = msgContent ? Object.keys(Object.values(msgContent)[0] as object ?? {}) : [];
  console.log('[media-handler] rawMessage keys:', Object.keys(rawMessage));
  console.log('[media-handler] message type fields:', mediaFields);
  console.log('[media-handler] inner message fields:', innerFields);

  const response = await axios.post<{ base64: string }>(
    url,
    { message: rawMessage, convertToMp4: false },
    { headers: { apikey: EVOLUTION_API_KEY }, timeout: 60_000 },
  );

  const base64 = response.data?.base64;
  if (!base64) throw new Error('[media-handler] Evolution API returned no base64');

  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const buf = Buffer.from(raw, 'base64');
  console.log('[media-handler] decrypted buffer size:', buf.length);
  return buf;
}
