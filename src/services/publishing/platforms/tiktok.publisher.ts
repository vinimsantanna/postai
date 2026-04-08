/**
 * TikTok Content Posting API — video publishing via PULL_FROM_URL.
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
  thumbnailUrl?: string,
): Promise<TikTokPublishResult> {
  const body: Record<string, unknown> = {
    post_info: {
      title: copy.slice(0, 2200), // TikTok max title length
      privacy_level: 'PUBLIC_TO_EVERYONE',
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: videoUrl,
      ...(thumbnailUrl && { cover_url: thumbnailUrl }),
    },
  };

  const res = await fetch(`${BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`TikTok publish failed: ${await res.text()}`);

  const data = (await res.json()) as {
    data?: { publish_id?: string };
    error?: { message?: string };
  };

  if (data.error?.message) throw new Error(`TikTok error: ${data.error.message}`);

  const publishId = data.data?.publish_id ?? 'unknown';

  // TikTok post URL requires username; build a best-effort URL
  const userRes = await fetch(`${BASE}/user/info/?fields=display_name,open_id`, {
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
