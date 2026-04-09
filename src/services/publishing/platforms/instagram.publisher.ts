/**
 * Instagram Business API — supports Reels (video) and Feed (photo).
 * Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
 */

const BASE = 'https://graph.instagram.com/v21.0';
const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 20;

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
  // Step 1: Get IG user ID
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

async function publishReel(
  igUserId: string,
  accessToken: string,
  copy: string,
  videoUrl: string,
  coverPhotoUrl?: string,
): Promise<InstagramPublishResult> {
  const containerBody: Record<string, string> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption: copy,
    access_token: accessToken,
  };
  if (coverPhotoUrl) containerBody.cover_url = coverPhotoUrl;

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

async function publishPhoto(
  igUserId: string,
  accessToken: string,
  copy: string,
  photoUrl: string,
): Promise<InstagramPublishResult> {
  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: photoUrl,
      caption: copy,
      access_token: accessToken,
    }),
  });
  if (!containerRes.ok) throw new Error(`Instagram photo container failed: ${await containerRes.text()}`);
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
}

async function getPermalink(mediaId: string, accessToken: string): Promise<string | undefined> {
  const res = await fetch(`${BASE}/${mediaId}?fields=permalink&access_token=${accessToken}`);
  if (!res.ok) return undefined;
  return ((await res.json()) as { permalink?: string }).permalink;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
