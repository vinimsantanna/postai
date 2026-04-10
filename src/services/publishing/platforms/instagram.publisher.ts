/**
 * Instagram Business API — supports Reels (video), Feed (photo) and Stories.
 * Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
 */

const BASE = 'https://graph.instagram.com/v21.0';
const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_ATTEMPTS = 60; // 5s × 60 = 5 min max for large videos

export interface InstagramPublishResult {
  postId: string;
  postUrl: string;
}

export async function publishToInstagram(
  accessToken: string,
  copy: string,
  videoUrl?: string,
  photoUrl?: string,
  coverPhotoUrl?: string,
): Promise<InstagramPublishResult> {
  const meRes = await fetch(`${BASE}/me?fields=id,username&access_token=${accessToken}`);
  if (!meRes.ok) throw new Error(`Instagram /me failed: ${await meRes.text()}`);
  const me = (await meRes.json()) as { id: string; username: string };

  if (videoUrl) {
    return publishReel(me.id, accessToken, copy, videoUrl, coverPhotoUrl);
  } else if (photoUrl) {
    return publishPhoto(me.id, accessToken, copy, photoUrl);
  } else {
    throw new Error('Instagram: videoUrl or photoUrl is required');
  }
}

/**
 * Publishes a Story (video or photo). Fire-and-forget from caller.
 * Stories expire after 24h and don't appear in the feed.
 */
export async function publishInstagramStory(
  accessToken: string,
  videoUrl?: string,
  photoUrl?: string,
): Promise<void> {
  const meRes = await fetch(`${BASE}/me?fields=id&access_token=${accessToken}`);
  if (!meRes.ok) throw new Error(`Instagram /me failed: ${await meRes.text()}`);
  const me = (await meRes.json()) as { id: string };

  const containerBody: Record<string, unknown> = {
    media_type: 'STORIES',
    access_token: accessToken,
  };

  if (videoUrl) {
    containerBody.video_url = videoUrl;
  } else if (photoUrl) {
    containerBody.image_url = photoUrl;
  } else {
    throw new Error('Instagram Story: videoUrl or photoUrl is required');
  }

  const containerRes = await fetch(`${BASE}/${me.id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  });
  if (!containerRes.ok) throw new Error(`Instagram story container failed: ${await containerRes.text()}`);
  const { id: containerId } = (await containerRes.json()) as { id: string };

  if (videoUrl) await pollContainerReady(containerId, accessToken);

  const publishRes = await fetch(`${BASE}/${me.id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Instagram story publish failed: ${await publishRes.text()}`);
}

async function publishReel(
  igUserId: string,
  accessToken: string,
  copy: string,
  videoUrl: string,
  coverPhotoUrl?: string,
): Promise<InstagramPublishResult> {
  const containerBody: Record<string, unknown> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption: copy,
    access_token: accessToken,
  };
  if (coverPhotoUrl) containerBody.cover_url = toInstagramAspectRatio(coverPhotoUrl);

  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  });
  if (!containerRes.ok) throw new Error(`Instagram container failed: ${await containerRes.text()}`);
  const { id: containerId } = (await containerRes.json()) as { id: string };

  await pollContainerReady(containerId, accessToken);

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
  const { id: mediaId } = (await publishRes.json()) as { id: string };

  const permalink = await getPermalink(mediaId, accessToken);
  return { postId: mediaId, postUrl: permalink ?? `https://www.instagram.com/reel/${mediaId}` };
}

/**
 * Applies Cloudinary auto-crop transformation to fit Instagram feed aspect ratio (4:5).
 * Only modifies Cloudinary URLs — other URLs are returned as-is.
 * Uses c_fill (centered crop) + g_auto (smart gravity) to preserve the main subject.
 */
function toInstagramAspectRatio(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  // Insert transformation after /upload/
  return url.replace('/upload/', '/upload/c_fill,ar_4:5,w_1080,g_auto/');
}

async function publishPhoto(
  igUserId: string,
  accessToken: string,
  copy: string,
  photoUrl: string,
): Promise<InstagramPublishResult> {
  console.log(`[instagram] publishPhoto url=${photoUrl}`);
  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: photoUrl,
      caption: copy,
      access_token: accessToken,
    }),
  });
  if (!containerRes.ok) {
    const body = await containerRes.text();
    console.error(`[instagram] publishPhoto container error: ${body}`);
    throw new Error(`Instagram photo container failed: ${body}`);
  }
  const { id: containerId } = (await containerRes.json()) as { id: string };

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Instagram photo publish failed: ${await publishRes.text()}`);
  const { id: mediaId } = (await publishRes.json()) as { id: string };

  const permalink = await getPermalink(mediaId, accessToken);
  return { postId: mediaId, postUrl: permalink ?? `https://www.instagram.com/p/${mediaId}` };
}

async function pollContainerReady(containerId: string, accessToken: string): Promise<void> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    const res = await fetch(
      `${BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
    );
    if (!res.ok) break;
    const data = (await res.json()) as { status_code?: string; status?: string };

    if (data.status_code === 'FINISHED' || data.status === 'FINISHED') return;
    if (data.status_code === 'ERROR' || data.status === 'ERROR') {
      throw new Error(`Instagram container error: ${JSON.stringify(data)}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Instagram video processing timeout — o vídeo pode ser muito grande ou o Instagram está lento. Tente novamente.');
}

async function getPermalink(mediaId: string, accessToken: string): Promise<string | undefined> {
  const res = await fetch(`${BASE}/${mediaId}?fields=permalink&access_token=${accessToken}`);
  if (!res.ok) return undefined;
  return ((await res.json()) as { permalink?: string }).permalink;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
