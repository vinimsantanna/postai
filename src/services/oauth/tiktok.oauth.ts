import { apiTokenRepository } from '@/repositories/api-token.repository';
import { encodeState, decodeState } from '@/lib/oauth-state';

const PLATFORM = 'TIKTOK' as const;

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const REVOKE_URL = 'https://open.tiktokapis.com/v2/oauth/revoke/';
const USERINFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

const SCOPES = ['video.upload', 'user.info.basic'].join(',');

function getConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey || !clientSecret || !redirectUri) {
    throw new Error('TikTok OAuth not configured (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI)');
  }
  return { clientKey, clientSecret, redirectUri };
}


export const tiktokOAuth = {
  getAuthUrl(userId: string, clientId?: string): string {
    const { clientKey, redirectUri } = getConfig();
    const state = encodeState({ userId, clientId });
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params}`;
  },

  async handleCallback(code: string, state: string) {
    const { clientKey, clientSecret, redirectUri } = getConfig();
    const { userId, clientId } = decodeState(state);

    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw Object.assign(new Error(`TikTok token exchange failed: ${err}`), { status: 502 });
    }

    const data = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_expires_in?: number;
      open_id?: string;
      error?: string;
      error_description?: string;
    };

    if (!data.access_token) {
      const reason = data.error_description || data.error || JSON.stringify(data);
      throw Object.assign(new Error(`TikTok token exchange failed: ${reason}`), { status: 502 });
    }

    const { access_token, refresh_token, expires_in, open_id } = data as Required<typeof data>;

    // Get username
    const meRes = await fetch(`${USERINFO_URL}?fields=display_name,avatar_url`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const me = meRes.ok ? ((await meRes.json()) as { data?: { user?: { display_name?: string } } }) : {};
    const displayName = me.data?.user?.display_name;
    const accountName = displayName ? `@${displayName}` : `tk_${open_id.slice(0, 8)}`;

    const expiresAt = new Date(Date.now() + expires_in * 1000);
    await apiTokenRepository.upsert({
      userId,
      clientId,
      platform: PLATFORM,
      accountName,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    });

    return { platform: PLATFORM, accountName };
  },

  async refreshToken(userId: string, clientId?: string) {
    const token = await apiTokenRepository.findByUserAndPlatform(userId, PLATFORM, clientId);
    if (!token) throw Object.assign(new Error('TikTok not connected'), { status: 404 });
    if (!token.refreshToken) throw Object.assign(new Error('No refresh token available'), { status: 400 });

    const { clientKey, clientSecret } = getConfig();
    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) {
      const err = await res.text();
      throw Object.assign(new Error(`TikTok refresh failed: ${err}`), { status: 502 });
    }

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      const reason = data.error_description || data.error || JSON.stringify(data);
      throw Object.assign(new Error(`TikTok refresh failed: ${reason}`), { status: 502 });
    }
    const { access_token, expires_in } = data as Required<typeof data>;
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    await apiTokenRepository.updateAccessToken(token.id, access_token, expiresAt);
    return access_token;
  },

  async revokeToken(userId: string, clientId?: string) {
    const token = await apiTokenRepository.findByUserAndPlatform(userId, PLATFORM, clientId);
    if (token) {
      const { clientKey, clientSecret } = getConfig();
      const body = new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        token: token.accessToken,
      });
      // Best effort — ignore revocation errors
      await fetch(REVOKE_URL, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null);
    }
    await apiTokenRepository.softDelete(userId, PLATFORM, clientId);
  },
};
