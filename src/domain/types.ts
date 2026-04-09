export type { Plan, UserStatus, Platform, CampaignStatus, SessionStatus } from '@prisma/client';

// ============================================================
// WhatsApp / Evolution API types
// ============================================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'button' | 'unknown';

export interface ParsedMessage {
  type: MessageType;
  from: string;       // normalized phone number
  text?: string;      // text content or button label
  mediaUrl?: string;  // data: URL (base64) or encrypted CDN URL
  mimeType?: string;
  messageId: string;
  timestamp: number;
  // Full WAMessage passed to Evolution API decryption endpoint when mediaUrl is CDN URL
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
      imageMessage?: { url?: string; mimetype?: string; caption?: string; base64?: string };
      videoMessage?: { url?: string; mimetype?: string; caption?: string; base64?: string };
      audioMessage?: { url?: string; mimetype?: string; base64?: string };
      documentMessage?: { url?: string; mimetype?: string; title?: string; base64?: string };
      buttonsResponseMessage?: { selectedButtonId?: string; selectedDisplayText?: string };
    };
    // Present when webhookBase64=true — base64-encoded media at data level
    base64?: string;
    mediaType?: string;
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
  | 'waiting_schedule'
  | 'waiting_schedule_date'
  | 'confirm_schedule'
  | 'confirm_publish';

export interface CampaignDraft {
  copy?: string;
  mediaType?: 'photo' | 'video';
  videoUrl?: string;
  photoUrl?: string;
  coverPhotoUrl?: string;
  platforms?: string[];
  scheduledAt?: string;      // ISO string UTC
  isScheduled?: boolean;     // true when coming from option '2'
  withStories?: boolean;     // true when user wants to also post to Instagram Stories
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
