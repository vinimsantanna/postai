import type { Response } from 'express';
import type { AuthRequest } from '@/api/middleware/auth.middleware';
import { instagramOAuth } from '@/services/oauth/instagram.oauth';
import { tiktokOAuth } from '@/services/oauth/tiktok.oauth';
import { linkedinOAuth } from '@/services/oauth/linkedin.oauth';
import { youtubeOAuth } from '@/services/oauth/youtube.oauth';
import { apiTokenRepository } from '@/repositories/api-token.repository';
import type { Platform } from '@prisma/client';

const SUPPORTED_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'youtube'] as const;
type PlatformSlug = (typeof SUPPORTED_PLATFORMS)[number];

const PLATFORM_MAP: Record<PlatformSlug, Platform> = {
  instagram: 'INSTAGRAM',
  tiktok: 'TIKTOK',
  linkedin: 'LINKEDIN',
  youtube: 'YOUTUBE',
};

const oauthProviders = {
  instagram: instagramOAuth,
  tiktok: tiktokOAuth,
  linkedin: linkedinOAuth,
  youtube: youtubeOAuth,
};

function getPlatformSlug(platform: string): PlatformSlug {
  if (!SUPPORTED_PLATFORMS.includes(platform as PlatformSlug)) {
    throw Object.assign(new Error(`Unsupported platform: ${platform}`), { status: 400 });
  }
  return platform as PlatformSlug;
}

export const oauthController = {
  // GET /oauth/:platform/connect?client_id=<optional>
  async connect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const slug = getPlatformSlug(req.params.platform);
      const userId = req.user!.id;
      const clientId = req.query.client_id as string | undefined;

      const url = oauthProviders[slug].getAuthUrl(userId, clientId);
      res.json({ url });
    } catch (err: unknown) {
      const e = err as { status?: number; message: string };
      res.status(e.status ?? 500).json({ error: e.message });
    }
  },

  // GET /oauth/:platform/callback?code=...&state=...
  async callback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const slug = getPlatformSlug(req.params.platform);
      const { code, state, error } = req.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      if (error) {
        res.status(400).json({ error: `OAuth denied: ${error}` });
        return;
      }
      if (!code || !state) {
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const result = await oauthProviders[slug].handleCallback(code, state);
      res.json({ success: true, ...result });
    } catch (err: unknown) {
      const e = err as { status?: number; message: string };
      res.status(e.status ?? 500).json({ error: e.message });
    }
  },

  // GET /oauth/connections
  async listConnections(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const clientId = req.query.client_id as string | undefined;
      const tokens = await apiTokenRepository.findByUser(userId, clientId);

      const connected = tokens.map((t) => ({
        platform: t.platform,
        accountName: t.accountName,
        expiresAt: t.expiresAt,
        connected: true,
      }));

      // Fill in disconnected platforms
      const connectedPlatforms = new Set(connected.map((c) => c.platform));
      const all = (['INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'YOUTUBE'] as Platform[]).map((p) => {
        const found = connected.find((c) => c.platform === p);
        return found ?? { platform: p, accountName: null, expiresAt: null, connected: false };
      });

      res.json({ connections: all, connectedCount: connectedPlatforms.size });
    } catch (err: unknown) {
      const e = err as { status?: number; message: string };
      res.status(e.status ?? 500).json({ error: e.message });
    }
  },

  // DELETE /oauth/:platform/disconnect?client_id=<optional>
  async disconnect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const slug = getPlatformSlug(req.params.platform);
      const userId = req.user!.id;
      const clientId = req.query.client_id as string | undefined;

      await oauthProviders[slug].revokeToken(userId, clientId);
      res.json({ success: true, platform: PLATFORM_MAP[slug] });
    } catch (err: unknown) {
      const e = err as { status?: number; message: string };
      res.status(e.status ?? 500).json({ error: e.message });
    }
  },

  // POST /oauth/:platform/refresh  (manual token refresh)
  async refresh(req: AuthRequest, res: Response): Promise<void> {
    try {
      const slug = getPlatformSlug(req.params.platform);
      const userId = req.user!.id;
      const clientId = req.query.client_id as string | undefined;

      await oauthProviders[slug].refreshToken(userId, clientId);
      res.json({ success: true, platform: PLATFORM_MAP[slug] });
    } catch (err: unknown) {
      const e = err as { status?: number; message: string };
      res.status(e.status ?? 500).json({ error: e.message });
    }
  },
};
