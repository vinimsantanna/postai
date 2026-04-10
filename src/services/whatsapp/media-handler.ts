import crypto from 'crypto';
import axios from 'axios';
import sharp from 'sharp';
import { supabaseStorage } from '@/lib/supabase';

// HKDF info strings per WhatsApp media type
const WHATSAPP_HKDF_INFO: Record<string, string> = {
  image: 'WhatsApp Image Keys',
  video: 'WhatsApp Video Keys',
  audio: 'WhatsApp Audio Keys',
  document: 'WhatsApp Document Keys',
};

interface DerivedKeys {
  iv: Buffer;
  cipherKey: Buffer;
  macKey: Buffer;
}

function deriveKeys(mediaKey: Buffer, infoStr: string): DerivedKeys {
  const salt = Buffer.alloc(32, 0);
  const expanded = Buffer.from(
    crypto.hkdfSync('sha256', mediaKey, salt, Buffer.from(infoStr), 112),
  );
  return {
    iv: expanded.subarray(0, 16),
    cipherKey: expanded.subarray(16, 48),
    macKey: expanded.subarray(48, 80),
  };
}

/**
 * Verifies the HMAC-SHA256 of the CDN file.
 * WhatsApp CDN file = [fileData][mac(10 bytes)]
 * mac = HMAC-SHA256(macKey, iv + ciphertext)[:10]
 * where iv may come from HKDF or from the first 16 bytes of the file.
 */
function verifyMac(macKey: Buffer, iv: Buffer, ciphertext: Buffer, mac: Buffer): boolean {
  const expected = crypto
    .createHmac('sha256', macKey)
    .update(iv)
    .update(ciphertext)
    .digest()
    .subarray(0, 10);
  return expected.length === mac.length && crypto.timingSafeEqual(expected, mac);
}

/**
 * Decrypts WhatsApp media using AES-256-CBC.
 *
 * Tries all combinations of:
 *   - info string: declared type + fallback types
 *   - IV source: HKDF-derived (spec) or first 16 bytes of CDN file (alt format)
 *
 * Selects the combination whose HMAC-SHA256 validates correctly.
 */
async function decryptWhatsAppMedia(
  encryptedUrl: string,
  mediaKeyBase64: string,
  whatsappMediaType: string,
): Promise<Buffer> {
  const mediaKey = Buffer.from(mediaKeyBase64, 'base64');

  // Candidates in priority order: declared type first, then fallbacks
  const primaryInfo = WHATSAPP_HKDF_INFO[whatsappMediaType] ?? 'WhatsApp Document Keys';
  const infoStrings = [
    primaryInfo,
    ...Object.values(WHATSAPP_HKDF_INFO).filter((s) => s !== primaryInfo),
  ];

  const response = await axios.get<ArrayBuffer>(encryptedUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 500 * 1024 * 1024,
  });
  const encData = Buffer.from(response.data);

  if (encData.length < 26) {
    throw new Error(`Downloaded file too small: ${encData.length} bytes`);
  }

  const mac = encData.subarray(-10);
  const fileBody = encData.subarray(0, -10); // everything except last 10 bytes

  for (const infoStr of infoStrings) {
    const keys = deriveKeys(mediaKey, infoStr);

    // Format A: IV from HKDF, ciphertext = entire fileBody
    if (verifyMac(keys.macKey, keys.iv, fileBody, mac)) {
      const decipher = crypto.createDecipheriv('aes-256-cbc', keys.cipherKey, keys.iv);
      return Buffer.concat([decipher.update(fileBody), decipher.final()]);
    }

    // Format B: IV = first 16 bytes of file, ciphertext = fileBody[16:]
    if (fileBody.length >= 16) {
      const fileIv = fileBody.subarray(0, 16);
      const ciphertext = fileBody.subarray(16);
      if (verifyMac(keys.macKey, fileIv, ciphertext, mac)) {
        const decipher = crypto.createDecipheriv('aes-256-cbc', keys.cipherKey, fileIv);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      }
    }
  }

  throw new Error(
    `WhatsApp media decryption failed: HMAC mismatch for all key types (mediaType=${whatsappMediaType}, fileSize=${encData.length})`,
  );
}

/**
 * Crops image to 4:5 aspect ratio (Instagram feed max portrait).
 * Uses center-gravity crop so the main subject is preserved.
 * Images already within 4:5–1.91:1 are returned unchanged.
 */
async function cropToInstagramRatio(buffer: Buffer): Promise<Buffer> {
  // Apply EXIF auto-rotation first so width/height reflect true visual dimensions.
  // Phone portraits are stored as landscape bytes + EXIF rotate flag — without this
  // step the ratio check uses raw (pre-rotation) dimensions and skips the crop.
  const rotated = await sharp(buffer).rotate().toBuffer();

  const meta = await sharp(rotated).metadata();
  const { width = 0, height = 0 } = meta;
  if (!width || !height) return rotated;

  const ratio = width / height;
  const MIN_RATIO = 4 / 5;  // 0.8  — max portrait
  const MAX_RATIO = 1.91;   // max landscape

  if (ratio >= MIN_RATIO && ratio <= MAX_RATIO) return rotated; // already valid

  let newWidth: number;
  let newHeight: number;

  if (ratio < MIN_RATIO) {
    // Too tall (e.g. 9:16) → keep width, crop height to 4:5
    newWidth = width;
    newHeight = Math.round(width / MIN_RATIO);
  } else {
    // Too wide (e.g. 16:9) → keep height, crop width to 1.91:1
    newWidth = Math.round(height * MAX_RATIO);
    newHeight = height;
  }

  return sharp(rotated)
    .resize(newWidth, newHeight, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toBuffer();
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
  } else if (mediaKey) {
    buffer = await decryptWhatsAppMedia(mediaUrl, mediaKey, whatsappMediaType ?? 'document');
  } else {
    throw new Error('[media-handler] Cannot fetch media: no base64 and no mediaKey');
  }

  // Crop images to 4:5 aspect ratio for Instagram feed compatibility
  if (type === 'image') {
    buffer = await cropToInstagramRatio(buffer);
  }

  return supabaseStorage.upload(path, buffer, contentType);
}
