import { apiTokenRepository } from '@/repositories/api-token.repository';
import { encodeState, decodeState } from '@/lib/oauth-state';

const PLATFORM = 'LINKEDIN' as const;

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const REVOKE_URL = 'https://www.linkedin.com/oauth/v2/revoke';
const ME_URL = 'https://api.linkedin.com/v2/me';

// w_member_social for publishing; r_liteprofile for user info
const SCOPES = ['w_member_social', 'r_liteprofile'].join(' ');

// LinkedIn access tokens expire in 60 days; refresh tokens in 1 year
const ACCESS_TOKEN_TTL = 60 * 24 * 60 * 60 * 1000;

function getConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('LinkedIn OAuth not configured (LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI)');
  }
  return { clientId, clientSecret, redirectUri };
}


export const linkedinOAuth = {
  getAuthUrl(userId: string, clientId?: string): string {
    const config = getConfig();
    const state = encodeState({ userId, clientId });
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params}`;
  },

  async handleCallback(code: string, state: string) {
    const config = getConfig();
    const { userId, clientId } = decodeState(state);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw Object.assign(new Error(`LinkedIn token exchange failed: ${err}`), { status: 502 });
    }

    const { access_token, refresh_token, expires_in } = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Get profile
    const meRes = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    let accountName = 'linkedin_user';
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        localizedFirstName?: string;
        localizedLastName?: string;
        id: string;
      };
      if (me.localizedFirstName) {
        accountName = `${me.localizedFirstName} ${me.localizedLastName ?? ''}`.trim();
      } else {
        accountName = `li_${me.id.slice(0, 8)}`;
      }
    }

    const ttl = expires_in ? expires_in * 1000 : ACCESS_TOKEN_TTL;
    const expiresAt = new Date(Date.now() + ttl);

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
    if (!token) throw Object.assign(new Error('LinkedIn not connected'), { status: 404 });
    if (!token.refreshToken) throw Object.assign(new Error('No refresh token available'), { status: 400 });

    const config = getConfig();
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) {
      const err = await res.text();
      throw Object.assign(new Error(`LinkedIn refresh failed: ${err}`), { status: 502 });
    }

    const { access_token, expires_in } = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };

    const ttl = expires_in ? expires_in * 1000 : ACCESS_TOKEN_TTL;
    const expiresAt = new Date(Date.now() + ttl);
    await apiTokenRepository.updateAccessToken(token.id, access_token, expiresAt);
    return access_token;
  },

  async revokeToken(userId: string, clientId?: string) {
    const token = await apiTokenRepository.findByUserAndPlatform(userId, PLATFORM, clientId);
    if (token) {
      const config = getConfig();
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token: token.accessToken,
      });
      await fetch(REVOKE_URL, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => null);
    }
    await apiTokenRepository.softDelete(userId, PLATFORM, clientId);
  },
};
