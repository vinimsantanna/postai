/**
 * TikTok Content Posting API — video publishing via FILE_UPLOAD.
 * PULL_FROM_URL requires domain verification; FILE_UPLOAD does not.
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 */

const BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokPublishResult {
  publishId: string;
  postUrl: string;
}

export async function publishToTikTok(
  accessToken: string,
  copy: string,
  videoUrl: string,
  _thumbnailUrl?: string,
): Promise<TikTokPublishResult> {
  // Step 1: Download video from Supabase
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
  const videoBuffer = await videoRes.arrayBuffer();
  const videoSize = videoBuffer.byteLength;

  // Step 2: Init upload on TikTok via "Upload to Inbox" (rascunho).
  // Direct Post requer auditoria do app. Inbox não requer e funciona para apps não auditados.
  // O vídeo chega como rascunho na conta TikTok e o usuário publica manualmente.
  const initBody: Record<string, unknown> = {
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  };

  const initRes = await fetch(`${BASE}/post/publish/inbox/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(initBody),
  });

  console.log('[tiktok] init body sent:', JSON.stringify(initBody));
  const initRaw = await initRes.text();
  console.log('[tiktok] init response:', initRaw);
  if (!initRes.ok) throw new Error(`TikTok init failed: ${initRaw}`);

  const initData = JSON.parse(initRaw) as {
    data?: { upload_url?: string; publish_id?: string };
    error?: { message?: string; code?: string };
  };

  if (initData.error?.code && initData.error.code !== 'ok') {
    throw new Error(`TikTok init error [${initData.error.code}]: ${initData.error.message}`);
  }

  const uploadUrl = initData.data?.upload_url;
  const publishId = initData.data?.publish_id ?? 'unknown';

  if (!uploadUrl) throw new Error('TikTok did not return upload_url');

  // Step 3: Upload video in a single chunk
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
      'Content-Length': String(videoSize),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) throw new Error(`TikTok upload failed: ${await uploadRes.text()}`);

  // Build post URL from user profile
  const userRes = await fetch(`${BASE}/user/info/?fields=display_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let postUrl = 'https://www.tiktok.com';
  if (userRes.ok) {
    const user = (await userRes.json()) as { data?: { user?: { display_name?: string } } };
    const handle = user.data?.user?.display_name;
    if (handle) postUrl = `https://www.tiktok.com/@${handle}`;
  }

  return { publishId, postUrl };
}
