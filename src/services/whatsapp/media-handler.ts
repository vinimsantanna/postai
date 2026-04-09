import axios from 'axios';
import { supabaseStorage } from '@/lib/supabase';

/**
 * Uploads media to permanent storage (Cloudinary for video, Supabase for images).
 *
 * mediaUrl can be:
 *   - data:<mimetype>;base64,<data>  — from webhookBase64=true (preferred)
 *   - https://...                    — CDN URL (may be encrypted, last resort)
 */
export async function persistMedia(
  mediaUrl: string,
  userId: string,
  type: 'video' | 'image',
  messageId: string,
): Promise<string> {
  const ext = type === 'video' ? 'mp4' : 'jpg';
  const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  const path = `${type}s/${userId}/${Date.now()}-${messageId}.${ext}`;

  let buffer: Buffer;

  if (mediaUrl.startsWith('data:')) {
    const base64Data = mediaUrl.split(',')[1];
    if (!base64Data) throw new Error('[media-handler] Empty base64 data');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    // Direct CDN download (works when URL is not encrypted)
    const response = await axios.get<Buffer>(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 120_000,
      maxContentLength: 500 * 1024 * 1024,
    });
    buffer = Buffer.from(response.data);
  }

  return supabaseStorage.upload(path, buffer, contentType);
}
