import axios from 'axios';
import * as tus from 'tus-js-client';

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return { url, key };
}

const BUCKET = 'media';
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

/**
 * Upload via TUS resumable protocol (for files > 50MB).
 */
function uploadResumable(path: string, data: Buffer, contentType: string, url: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(data as never, {
      endpoint: `${url}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        Authorization: `Bearer ${key}`,
        'x-upsert': 'true',
      },
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType,
        cacheControl: '3600',
      },
      uploadSize: data.length,
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      onError: reject,
      onSuccess: () => resolve(),
    });

    upload.start();
  });
}

export const supabaseStorage = {
  /**
   * Upload a buffer to Supabase Storage.
   * Uses TUS resumable upload for files > 50MB, standard upload for smaller files.
   * Returns the public URL.
   */
  async upload(path: string, data: Buffer, contentType: string): Promise<string> {
    const { url, key } = getConfig();

    if (data.length > LARGE_FILE_THRESHOLD) {
      await uploadResumable(path, data, contentType, url, key);
    } else {
      await axios.post(`${url}/storage/v1/object/${BUCKET}/${path}`, data, {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        maxBodyLength: Infinity,
      });
    }

    return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
  },

  /**
   * Delete a file from Supabase Storage.
   */
  async delete(path: string): Promise<void> {
    const { url, key } = getConfig();
    await axios.delete(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => null); // best effort
  },
};
