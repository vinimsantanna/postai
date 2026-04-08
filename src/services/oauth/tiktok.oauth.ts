import crypto from 'crypto';
import { apiTokenRepository } from '@/repositories/api-token.repository';

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

function makeState(userId: string, clientId?: string): string {
  const payload = { userId, clientId, nonce: crypto.randomBytes(16).toString('hex') };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function parseState(state: string): { userId: string; clientId?: string } {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid OAuth state'), { status: 400 });
  }
}

export const tiktokOAuth = {
  getAuthUrl(userId: string, clientId?: string): string {
    const { clientKey, redirectUri } = getConfig();
    const state = makeState(userId, clientId);
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
    const { userId, clientId } = parseState(state);

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
      data: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_expires_in: number;
        open_id: string;
      };
    };

    const { access_token, refresh_token, expires_in, open_id } = data.data;

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

    const data = (await res.json()) as { data: { access_token: string; expires_in: number } };
    const { access_token, expires_in } = data.data;
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
