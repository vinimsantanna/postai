export type { Plan, UserStatus, Platform, CampaignStatus, SessionStatus } from '@prisma/client';

// ============================================================
// WhatsApp / Evolution API types
// ============================================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'button' | 'unknown';

export interface ParsedMessage {
  type: MessageType;
  from: string;       // normalized phone number
  text?: string;      // text content or button label
  mediaUrl?: string;  // URL for media messages
  mimeType?: string;
  messageId: string;
  timestamp: number;
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
  | 'waiting_copy'
  | 'waiting_video'
  | 'waiting_thumbnail'
  | 'waiting_schedule'
  | 'waiting_schedule_date'
  | 'confirm_schedule'
  | 'confirm_publish'
  | 'history';

export interface CampaignDraft {
  copy?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
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
