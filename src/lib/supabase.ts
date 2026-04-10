import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return { url, key };
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

const BUCKET = 'media';

/**
 * Upload video to Cloudinary (no file size limit on free tier for videos up to 100MB).
 * Returns the secure URL.
 */
async function uploadToCloudinary(data: Buffer, folder: string, publicId: string, resourceType: 'video' | 'image'): Promise<string> {
  const config = getCloudinaryConfig();
  if (!config) throw new Error('Cloudinary not configured');

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', data, { filename: `${publicId}.${resourceType === 'video' ? 'mp4' : 'jpg'}` });
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('signature', signature);

  const response = await axios.post<{ secure_url: string }>(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    form,
    {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300_000,
    },
  );

  return response.data.secure_url;
}

export const supabaseStorage = {
  /**
   * Upload a buffer to storage.
   * Uses Cloudinary for videos if configured (bypasses Supabase 50MB limit).
   * Falls back to Supabase for images or when Cloudinary is not configured.
   * Returns the public URL.
   */
  async upload(path: string, data: Buffer, contentType: string): Promise<string> {
    const isVideo = contentType.startsWith('video/');

    // Use Cloudinary for videos when configured
    if (isVideo && getCloudinaryConfig()) {
      const parts = path.split('/');
      const filename = parts.pop()!.replace('.mp4', '');
      const folder = parts.join('/');
      return uploadToCloudinary(data, folder, filename, 'video');
    }

    // Images always go to Supabase (already cropped by sharp, well within 50 MB limit).
    // Only videos use Cloudinary (to bypass Supabase's 50 MB restriction).

    // Default: Supabase Storage
    const { url, key } = getSupabaseConfig();
    await axios.post(`${url}/storage/v1/object/${BUCKET}/${path}`, data, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      maxBodyLength: Infinity,
    });

    return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
  },

  /**
   * Delete a file from Supabase Storage.
   */
  async delete(path: string): Promise<void> {
    const { url, key } = getSupabaseConfig();
    await axios.delete(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => null); // best effort
  },
};
