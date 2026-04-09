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
  const infoStr = WHATSAPP_HKDF_INFO[whatsappMediaType] ?? 'WhatsApp Document Keys';
  const salt = Buffer.alloc(32, 0);

  console.log('[media-handler] mediaKey[:8]:', mediaKey.slice(0, 8).toString('hex'), '| len:', mediaKey.length, '| info:', infoStr);

  // Use Node.js built-in HKDF (crypto.hkdfSync, Node 15+)
  const expanded = Buffer.from(
    crypto.hkdfSync('sha256', mediaKey, salt, Buffer.from(infoStr), 112),
  );
  const iv = expanded.subarray(0, 16);
  const cipherKey = expanded.subarray(16, 48);

  console.log('[media-handler] iv:', iv.toString('hex'), '| cipherKey[:8]:', cipherKey.slice(0, 8).toString('hex'));

  // Download encrypted CDN file
  const response = await axios.get<ArrayBuffer>(encryptedUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 500 * 1024 * 1024,
  });
  const encData = Buffer.from(response.data);
  console.log('[media-handler] downloaded:', encData.length, 'bytes | first4:', encData.slice(0, 4).toString('hex'));

  // Strip 10-byte HMAC suffix
  const ciphertext = encData.subarray(0, -10);

  // Decrypt AES-256-CBC
  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Uploads media to permanent storage (Supabase).
 *
 * mediaUrl can be:
 *   - data:<mimetype>;base64,<data>  — from webhookBase64=true (no decryption needed)
 *   - https://mmg.whatsapp.net/...   — encrypted CDN (decrypted locally with mediaKey)
 */
export async function persistMedia(
  mediaUrl: string,
  userId: string,
  type: 'video' | 'image',
  messageId: string,
  mediaKey?: string,
  whatsappMediaType?: string,
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
  } else {
    throw new Error('[media-handler] Cannot fetch media: no base64 and no mediaKey');
  }

  return supabaseStorage.upload(path, buffer, contentType);
}
