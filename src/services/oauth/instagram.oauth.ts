import crypto from 'crypto';
import { apiTokenRepository } from '@/repositories/api-token.repository';

const PLATFORM = 'INSTAGRAM' as const;

// Instagram Business API (substitui Basic Display API em 2024)
const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const LONG_LIVED_URL = 'https://graph.instagram.com/access_token';
const REFRESH_URL = 'https://graph.instagram.com/refresh_access_token';
const ME_URL = 'https://graph.instagram.com/me';

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
].join(',');

function getConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new Error('Instagram OAuth not configured (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_REDIRECT_URI)');
  }
  return { appId, appSecret, redirectUri };
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

export const instagramOAuth = {
  getAuthUrl(userId: string, clientId?: string): string {
    const { appId, redirectUri } = getConfig();
    const state = makeState(userId, clientId);
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      response_type: 'code',
      state,
    });
    return `${AUTH_URL}?${params}`;
  },

  async handleCallback(code: string, state: string) {
    const { appId, appSecret, redirectUri } = getConfig();
    const { userId, clientId } = parseState(state);

    // Step 1: Exchange code for short-lived token
    const tokenBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      body: tokenBody,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw Object.assign(new Error(`Instagram token exchange failed: ${err}`), { status: 502 });
    }

    const { access_token: shortToken, user_id: igUserId } = (await tokenRes.json()) as {
      access_token: string;
      user_id: string;
    };

    // Step 2: Exchange for long-lived token (60 days)
    const longParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortToken,
    });

    const longRes = await fetch(`${LONG_LIVED_URL}?${longParams}`);
    if (!longRes.ok) {
      const err = await longRes.text();
      throw Object.assign(new Error(`Instagram long-lived token failed: ${err}`), { status: 502 });
    }

    const { access_token: longToken, expires_in: expiresIn } = (await longRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    // Step 3: Get account name
    const meParams = new URLSearchParams({ fields: 'username', access_token: longToken });
    const meRes = await fetch(`${ME_URL}?${meParams}`);
    const me = meRes.ok ? ((await meRes.json()) as { username?: string }) : { username: undefined };
    const accountName = me.username ? `@${me.username}` : `ig_${igUserId}`;

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await apiTokenRepository.upsert({
      userId,
      clientId,
      platform: PLATFORM,
      accountName,
      accessToken: longToken,
      expiresAt,
    });

    return { platform: PLATFORM, accountName };
  },

  async refreshToken(userId: string, clientId?: string) {
    const token = await apiTokenRepository.findByUserAndPlatform(userId, PLATFORM, clientId);
    if (!token) throw Object.assign(new Error('Instagram not connected'), { status: 404 });

    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token.accessToken,
    });

    const res = await fetch(`${REFRESH_URL}?${params}`);
    if (!res.ok) {
      const err = await res.text();
      throw Object.assign(new Error(`Instagram refresh failed: ${err}`), { status: 502 });
    }

    const { access_token: newToken, expires_in: expiresIn } = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await apiTokenRepository.updateAccessToken(token.id, newToken, expiresAt);
    return newToken;
  },

  async revokeToken(userId: string, clientId?: string) {
    // Instagram Basic Display API does not support server-side revocation;
    // we just remove locally.
    await apiTokenRepository.softDelete(userId, PLATFORM, clientId);
  },
};
