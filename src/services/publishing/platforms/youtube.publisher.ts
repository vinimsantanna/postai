/**
 * YouTube Data API v3 — video upload via resumable upload.
 * Docs: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */

import axios from 'axios';

const UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';
const API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubePublishResult {
  videoId: string;
  postUrl: string;
}

export async function publishToYouTube(
  accessToken: string,
  copy: string,
  videoUrl: string,
  _thumbnailUrl?: string,
): Promise<YouTubePublishResult> {
  // Step 1: Download video
  const videoRes = await axios.get<Buffer>(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 256 * 1024 * 1024 * 1024, // 256GB YouTube limit (practical: 2GB for MVP)
  });
  const videoBuffer = Buffer.from(videoRes.data);
  const videoSize = videoBuffer.length;

  // Step 2: Initiate resumable upload
  const initRes = await fetch(
    `${UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
        'X-Upload-Content-Length': String(videoSize),
      },
      body: JSON.stringify({
        snippet: {
          title: copy.slice(0, 100), // YouTube max title length
          description: copy,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    },
  );

  if (!initRes.ok) throw new Error(`YouTube init upload failed: ${await initRes.text()}`);
  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('YouTube did not return upload URL');

  // Step 3: Upload video
  const uploadRes = await axios.put(uploadUrl, videoBuffer, {
    headers: {
      'Content-Type': 'video/*',
      'Content-Length': String(videoSize),
    },
    maxBodyLength: Infinity,
    timeout: 300_000, // 5 minutes
  });

  const videoId: string = (uploadRes.data as { id: string }).id;

  // Step 4: Upload thumbnail if provided (best effort)
  // Skipped for now — requires multipart form upload

  return {
    videoId,
    postUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };

  // Fallback: get video details
  const detailsRes = await fetch(
    `${API_BASE}/videos?part=snippet&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (detailsRes.ok) {
    // already returned above
  }
}
