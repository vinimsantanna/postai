import axios from 'axios';
import { supabaseStorage } from '@/lib/supabase';

/**
 * Downloads media from Evolution API (WhatsApp CDN, temporary URL)
 * and re-hosts on Supabase Storage (permanent URL).
 */
export async function persistMedia(
  evolutionUrl: string,
  userId: string,
  type: 'video' | 'image',
  messageId: string,
): Promise<string> {
  const ext = type === 'video' ? 'mp4' : 'jpg';
  const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  const path = `${type}s/${userId}/${Date.now()}-${messageId}.${ext}`;

  let buffer: Buffer;

  if (evolutionUrl.startsWith('data:')) {
    // base64 data URL — extract raw bytes
    const base64Data = evolutionUrl.split(',')[1];
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    // Download from Evolution API CDN
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const response = await axios.get<Buffer>(evolutionUrl, {
      responseType: 'arraybuffer',
      headers: evolutionKey ? { apikey: evolutionKey } : {},
      timeout: 120_000,
      maxContentLength: 500 * 1024 * 1024, // 500MB
    });
    buffer = Buffer.from(response.data);
  }

  const publicUrl = await supabaseStorage.upload(path, buffer, contentType);
  return publicUrl;
}
