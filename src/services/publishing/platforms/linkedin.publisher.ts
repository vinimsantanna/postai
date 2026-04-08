/**
 * LinkedIn UGC Posts API — video post publishing.
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
 *
 * Flow: register upload → upload bytes → create UGC post
 */

import axios from 'axios';

const BASE = 'https://api.linkedin.com/v2';

export interface LinkedInPublishResult {
  postId: string;
  postUrl: string;
}

export async function publishToLinkedIn(
  accessToken: string,
  copy: string,
  videoUrl: string,
  _thumbnailUrl?: string,
): Promise<LinkedInPublishResult> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  // Step 1: Get person URN
  const meRes = await fetch(`${BASE}/me`, { headers });
  if (!meRes.ok) throw new Error(`LinkedIn /me failed: ${await meRes.text()}`);
  const me = (await meRes.json()) as { id: string };
  const authorUrn = `urn:li:person:${me.id}`;

  // Step 2: Register video upload
  const registerRes = await fetch(`${BASE}/assets?action=registerUpload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        owner: authorUrn,
        serviceRelationships: [
          { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
        ],
      },
    }),
  });
  if (!registerRes.ok) throw new Error(`LinkedIn register upload failed: ${await registerRes.text()}`);
  const registerData = (await registerRes.json()) as {
    value: { uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: string } }; asset: string };
  };
  const uploadUrl =
    registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Step 3: Download video and upload to LinkedIn
  const videoBuffer = await axios.get<Buffer>(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 200 * 1024 * 1024, // 200MB LinkedIn limit
  });

  await axios.put(uploadUrl, videoBuffer.data, {
    headers: { 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity,
    timeout: 120_000,
  });

  // Step 4: Create UGC post
  const postRes = await fetch(`${BASE}/ugcPosts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: copy },
          shareMediaCategory: 'VIDEO',
          media: [
            {
              status: 'READY',
              media: assetUrn,
              title: { text: copy.slice(0, 200) },
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });
  if (!postRes.ok) throw new Error(`LinkedIn ugcPosts failed: ${await postRes.text()}`);
  const postData = (await postRes.json()) as { id: string };

  return {
    postId: postData.id,
    postUrl: `https://www.linkedin.com/feed/update/${postData.id}`,
  };
}
