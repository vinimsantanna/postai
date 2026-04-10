/**
 * TikTok Content Posting API — video publishing via FILE_UPLOAD to Inbox (draft).
 * Direct Post requer auditoria do app. Inbox/draft não requer.
 * Após auditoria: trocar para /v2/post/publish/video/init/ com privacy_level PUBLIC_TO_EVERYONE.
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-inbox-post
 */

const BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokPublishResult {
  publishId: string;
  postUrl: string;
}

export async function publishToTikTok(
  accessToken: string,
  _copy: string,
  videoUrl: string,
  _thumbnailUrl?: string,
): Promise<TikTokPublishResult> {
  // Step 1: Download video from Supabase
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
  const videoBuffer = await videoRes.arrayBuffer();
  const videoSize = videoBuffer.byteLength;

  console.log(`[tiktok] video downloaded: ${videoSize} bytes`);

  // Step 2: Init inbox upload (rascunho — sem auditoria necessária)
  const initBody = {
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

  // Step 3: Upload video em chunk único
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
      'Content-Length': String(videoSize),
    },
    body: videoBuffer,
  });

  const uploadStatus = uploadRes.status;
  console.log(`[tiktok] upload status: ${uploadStatus}`);
  if (!uploadRes.ok) throw new Error(`TikTok upload failed (${uploadStatus}): ${await uploadRes.text()}`);

  // Rascunho: retornar URL dos rascunhos do TikTok
  return { publishId, postUrl: 'tiktok://draft' };
}
