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
        await sessionService.handleIncoming(message);
        console.log('[webhook] done');
      } catch (err) {
        console.error('[webhook] Error processing message:', err);
      }
    });
  },
};
