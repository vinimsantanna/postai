export type { Plan, UserStatus, Platform, CampaignStatus, SessionStatus } from '@prisma/client';

// ============================================================
// WhatsApp / Evolution API types
// ============================================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'button' | 'unknown';

export interface MessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface ParsedMessage {
  type: MessageType;
  from: string;       // normalized phone number
  text?: string;      // text content or button label
  mediaUrl?: string;  // URL for media messages (may be encrypted)
  mimeType?: string;
  messageId: string;
  timestamp: number;
  // Used to fetch media from Evolution API (avoids encrypted CDN URLs)
  messageKey?: MessageKey;
  rawMessage?: Record<string, unknown>;
}

export interface EvolutionWebhookEvent {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      imageMessage?: { url?: string; mimetype?: string; caption?: string };
      videoMessage?: { url?: string; mimetype?: string; caption?: string };
      audioMessage?: { url?: string; mimetype?: string };
      documentMessage?: { url?: string; mimetype?: string; title?: string };
      buttonsResponseMessage?: { selectedButtonId?: string; selectedDisplayText?: string };
    };
    messageTimestamp?: number;
    pushName?: string;
  };
}

// ============================================================
// State Machine types
// ============================================================

export type ConversationState =
  | 'menu'
  | 'select_client'
  | 'create_client_name'
  | 'create_client_confirm'
  | 'waiting_copy'
  | 'waiting_media_type'
  | 'waiting_video'
  | 'waiting_photo'
  | 'waiting_cover_photo'
  | 'waiting_collab'
  | 'waiting_schedule'
  | 'waiting_schedule_date'
  | 'confirm_schedule'
  | 'confirm_publish'
  | 'history';

export interface CampaignDraft {
  copy?: string;
  mediaType?: 'photo' | 'video';
  videoUrl?: string;
  photoUrl?: string;
  coverPhotoUrl?: string;
  collaborators?: string[];
  platforms?: string[];
  scheduledAt?: string;      // ISO string UTC
  isScheduled?: boolean;     // true when coming from option '2'
  lastCampaignId?: string;   // set after publish so user can "retentar"
}

// ============================================================
// Auth types
// ============================================================

export interface JwtPayload {
  sub: string;   // userId
  email: string;
  plan: string;
  iat?: number;
  exp?: number;
}
