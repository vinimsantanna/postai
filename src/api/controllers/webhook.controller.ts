import type { Request, Response } from 'express';
import { parseMessage } from '@/services/whatsapp/message-parser';
import { sessionService } from '@/services/whatsapp/session.service';
import type { EvolutionWebhookEvent } from '@/domain/types';

export const webhookController = {
  async handleWhatsapp(req: Request, res: Response): Promise<void> {
    // Respond 200 immediately — Evolution API requires fast ACK
    res.status(200).json({ received: true });

    // Process asynchronously without blocking the response
    setImmediate(async () => {
      try {
        const event = req.body as EvolutionWebhookEvent;
        console.log('[webhook] event:', event.event, 'instance:', event.instance, 'fromMe:', event.data?.key?.fromMe);
        const message = parseMessage(event);

        if (!message) {
          console.log('[webhook] message filtered out (fromMe or unsupported)');
          return;
        }

        console.log('[webhook] processing type:', message.type, 'from:', message.from);
        // Temp: log raw media message fields for debugging
        const rawData = event.data as Record<string, unknown>;
        const msg = rawData.message as Record<string, unknown> | undefined;
        if (msg) {
          const mediaMsg = (msg.documentMessage ?? msg.imageMessage ?? msg.videoMessage) as Record<string, unknown> | undefined;
          if (mediaMsg) console.log('[webhook] media fields:', Object.keys(mediaMsg));
        }
        await sessionService.handleIncoming(message);
        console.log('[webhook] done');
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: unknown; status?: number } };
        if (axiosErr?.response?.data) {
          console.error('[webhook] Error processing message — status:', axiosErr.response.status, 'body:', JSON.stringify(axiosErr.response.data));
        } else {
          console.error('[webhook] Error processing message:', err);
        }
      }
    });
  },
};
