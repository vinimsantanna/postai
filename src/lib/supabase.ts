import axios from 'axios';

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return { url, key };
}

const BUCKET = 'media';

export const supabaseStorage = {
  /**
   * Upload a buffer to Supabase Storage.
   * Returns the public URL.
   */
  async upload(path: string, data: Buffer, contentType: string): Promise<string> {
    const { url, key } = getConfig();
    const endpoint = `${url}/storage/v1/object/${BUCKET}/${path}`;

    await axios.post(endpoint, data, {
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
    const { url, key } = getConfig();
    await axios.delete(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => null); // best effort
  },
};
