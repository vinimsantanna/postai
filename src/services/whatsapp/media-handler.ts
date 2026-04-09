import crypto from 'crypto';
import axios from 'axios';
import { supabaseStorage } from '@/lib/supabase';

// HKDF info strings per WhatsApp media type
const WHATSAPP_HKDF_INFO: Record<string, string> = {
  image: 'WhatsApp Image Keys',
  video: 'WhatsApp Video Keys',
  audio: 'WhatsApp Audio Keys',
  document: 'WhatsApp Document Keys',
};

/**
 * Decrypts WhatsApp media using AES-256-CBC.
 * The mediaKey is derived via HKDF-SHA256 with type-specific info strings.
 * CDN files end with a 10-byte HMAC suffix that must be stripped before decryption.
 */
async function decryptWhatsAppMedia(
  encryptedUrl: string,
  mediaKeyBase64: string,
  whatsappMediaType: string,
): Promise<Buffer> {
  const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
  const info = Buffer.from(WHATSAPP_HKDF_INFO[whatsappMediaType] ?? 'WhatsApp Document Keys');
  const salt = Buffer.alloc(32, 0);

  // HKDF extract + expand (112 bytes)
  const prk = crypto.createHmac('sha256', salt).update(mediaKey).digest();
  let t = Buffer.alloc(0);
  let expanded = Buffer.alloc(0);
  for (let i = 1; expanded.length < 112; i++) {
    t = crypto.createHmac('sha256', prk).update(Buffer.concat([t, info, Buffer.from([i])])).digest();
    expanded = Buffer.concat([expanded, t]);
  }
  const iv = expanded.subarray(0, 16);
  const cipherKey = expanded.subarray(16, 48);

  // Download encrypted CDN file
  const response = await axios.get<ArrayBuffer>(encryptedUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 500 * 1024 * 1024,
  });
  const encData = Buffer.from(response.data);

  // Strip 10-byte HMAC suffix
  const ciphertext = encData.subarray(0, -10);

  // Decrypt AES-256-CBC
  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Fallback when webhookBase64=true strips mediaKey from document messages.
 * Calls Evolution API's getBase64FromMediaMessage to decrypt server-side.
 */
async function fetchBase64ViaEvolutionApi(
  remoteJid: string,
  messageId: string,
  rawMessageContent: unknown,
  whatsappMediaType: string,
): Promise<Buffer> {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    throw new Error('[media-handler] Evolution API not configured for fallback');
  }

  const messageTypeKey = `${whatsappMediaType}Message`;
  const body = {
    message: {
      key: { remoteJid, fromMe: false, id: messageId },
      message: { [messageTypeKey]: rawMessageContent },
    },
    convertToMp4: false,
  };

  console.log('[media-handler] fallback: calling Evolution getBase64FromMediaMessage, type:', whatsappMediaType);
  const response = await axios.post(
    `${apiUrl}/message/getBase64FromMediaMessage/${instance}`,
    body,
    { headers: { apikey: apiKey }, timeout: 30_000 },
  );

  const base64: string = response.data?.base64;
  if (!base64) throw new Error('[media-handler] Evolution API returned no base64');

  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(raw, 'base64');
}

/**
 * Uploads media to permanent storage (Supabase).
 *
 * mediaUrl can be:
 *   - data:<mimetype>;base64,<data>  — from webhookBase64=true (no decryption needed)
 *   - https://mmg.whatsapp.net/...   — encrypted CDN (decrypted locally with mediaKey)
 *
 * When mediaKey is absent (webhookBase64=true strips it for documents),
 * falls back to Evolution API's getBase64FromMediaMessage endpoint.
 */
export async function persistMedia(
  mediaUrl: string,
  userId: string,
  type: 'video' | 'image',
  messageId: string,
  mediaKey?: string,
  whatsappMediaType?: string,
  remoteJid?: string,
  rawMessageContent?: unknown,
): Promise<string> {
  const ext = type === 'video' ? 'mp4' : 'jpg';
  const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  const path = `${type}s/${userId}/${Date.now()}-${messageId}.${ext}`;

  let buffer: Buffer;

  if (mediaUrl.startsWith('data:')) {
    const base64Data = mediaUrl.split(',')[1];
    if (!base64Data) throw new Error('[media-handler] Empty base64 data');
    buffer = Buffer.from(base64Data, 'base64');
    console.log('[media-handler] base64 inline, size:', buffer.length);
  } else if (mediaKey) {
    console.log('[media-handler] decrypting locally, type:', whatsappMediaType);
    buffer = await decryptWhatsAppMedia(mediaUrl, mediaKey, whatsappMediaType ?? 'document');
    console.log('[media-handler] decrypted, size:', buffer.length);
  } else if (remoteJid && rawMessageContent) {
    buffer = await fetchBase64ViaEvolutionApi(remoteJid, messageId, rawMessageContent, whatsappMediaType ?? 'document');
    console.log('[media-handler] evolution fallback, size:', buffer.length);
  } else {
    throw new Error('[media-handler] Cannot fetch media: no base64, no mediaKey, no fallback context');
  }

  return supabaseStorage.upload(path, buffer, contentType);
}
