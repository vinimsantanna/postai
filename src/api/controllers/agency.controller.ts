import type { Response } from 'express';
import { z } from 'zod';
import { clientManagerService } from '@/services/agency/client-manager.service';
import type { AuthRequest } from '@/api/middleware/auth.middleware';

const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  segment: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const agencyController = {
  async listClients(req: AuthRequest, res: Response): Promise<void> {
    try {
      const clients = await clientManagerService.listClients(req.user!.id);
      res.json({ clients });
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status ?? 500).json({ error: error.message });
    }
  },

  async createClient(req: AuthRequest, res: Response): Promise<void> {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }

    try {
      const client = await clientManagerService.createClient(req.user!.id, parsed.data);
      res.status(201).json({ client });
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status ?? 500).json({ error: error.message });
    }
  },

  async deleteClient(req: AuthRequest, res: Response): Promise<void> {
    const { clientId } = req.params;

    try {
      await clientManagerService.deleteClient(req.user!.id, clientId);
      res.status(204).send();
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      res.status(error.status ?? 500).json({ error: error.message });
    }
  },
};
