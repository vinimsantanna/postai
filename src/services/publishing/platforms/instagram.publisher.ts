/**
 * Instagram Business API — Reels publishing via video URL.
 * Docs: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media
 */

const BASE = 'https://graph.instagram.com/v21.0';
// Polling: container creation can take up to 60s for large videos
const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 20;

export interface InstagramPublishResult {
  postId: string;
  postUrl: string;
}

export async function publishToInstagram(
  accessToken: string,
  copy: string,
  videoUrl: string,
  _thumbnailUrl?: string,
): Promise<InstagramPublishResult> {
  // Step 1: Get IG user ID
  const meRes = await fetch(`${BASE}/me?fields=id,username&access_token=${accessToken}`);
  if (!meRes.ok) throw new Error(`Instagram /me failed: ${await meRes.text()}`);
  const me = (await meRes.json()) as { id: string; username: string };

  // Step 2: Create media container (Reels)
  const containerRes = await fetch(`${BASE}/${me.id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption: copy,
      access_token: accessToken,
    }),
  });
  if (!containerRes.ok) throw new Error(`Instagram container failed: ${await containerRes.text()}`);
  const { id: containerId } = (await containerRes.json()) as { id: string };

  // Step 3: Poll until container is ready (FINISHED)
  await pollContainerReady(containerId, accessToken);

  // Step 4: Publish
  const publishRes = await fetch(`${BASE}/${me.id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
  const { id: mediaId } = (await publishRes.json()) as { id: string };

  // Step 5: Get permalink
  const permalinkRes = await fetch(
    `${BASE}/${mediaId}?fields=permalink&access_token=${accessToken}`,
  );
  const permalink = permalinkRes.ok
    ? ((await permalinkRes.json()) as { permalink?: string }).permalink
    : undefined;

  return {
    postId: mediaId,
    postUrl: permalink ?? `https://www.instagram.com/p/${mediaId}`,
  };
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
