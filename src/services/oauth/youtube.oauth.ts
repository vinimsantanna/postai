import crypto from 'crypto';
import { apiTokenRepository } from '@/repositories/api-token.repository';

const PLATFORM = 'YOUTUBE' as const;

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CHANNEL_URL = 'https://www.googleapis.com/youtube/v3/channels';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

function getConfig() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('YouTube OAuth not configured (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI)');
  }
  return { clientId, clientSecret, redirectUri };
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

export const youtubeOAuth = {
  getAuthUrl(userId: string, clientId?: string): string {
    const config = getConfig();
    const state = makeState(userId, clientId);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',   // request refresh_token
      prompt: 'consent',        // force refresh_token on every auth
      state,
    });
    return `${AUTH_URL}?${params}`;
  },

  async handleCallback(code: string, state: string) {
    const config = getConfig();
    const { userId, clientId } = parseState(state);

    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw Object.assign(new Error(`YouTube token exchange failed: ${err}`), { status: 502 });
    }

    const { access_token, refresh_token, expires_in } = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Get channel name
    const channelRes = await fetch(
      `${CHANNEL_URL}?part=snippet&mine=true&fields=items(snippet/title)`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    let accountName = 'youtube_channel';
    if (channelRes.ok) {
      const data = (await channelRes.json()) as { items?: [{ snippet: { title: string } }] };
      const title = data.items?.[0]?.snippet?.title;
      if (title) accountName = title;
    }

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
    if (!token) throw Object.assign(new Error('YouTube not connected'), { status: 404 });
    if (!token.refreshToken) throw Object.assign(new Error('No refresh token available'), { status: 400 });

    const config = getConfig();
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
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
      throw Object.assign(new Error(`YouTube refresh failed: ${err}`), { status: 502 });
    }

    const { access_token, expires_in } = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + expires_in * 1000);
    await apiTokenRepository.updateAccessToken(token.id, access_token, expiresAt);
    return access_token;
  },

  async revokeToken(userId: string, clientId?: string) {
    const token = await apiTokenRepository.findByUserAndPlatform(userId, PLATFORM, clientId);
    if (token) {
      const params = new URLSearchParams({ token: token.accessToken });
      await fetch(`${REVOKE_URL}?${params}`, { method: 'POST' }).catch(() => null);
    }
    await apiTokenRepository.softDelete(userId, PLATFORM, clientId);
  },
};
