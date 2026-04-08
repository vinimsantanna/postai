import prisma from '@/lib/prisma';
import { sessionRepository } from '@/repositories/session.repository';
import { decrypt, normalizeCpf } from '@/lib/crypto';
import { whatsappService } from './whatsapp.service';
import { processMessage } from './state-machine/machine';
import { MESSAGES, MENU_TEXT } from './state-machine/messages';
import type { ParsedMessage } from '@/domain/types';

export const sessionService = {
  async handleIncoming(message: ParsedMessage): Promise<void> {
    const { from } = message;

    // Look for active session by phone
    const session = await sessionRepository.findActiveByPhone(from);

    if (!session) {
      // No session — need to identify by CPF
      await handleIdentification(from, message);
      return;
    }

    // Expire check — session.lastMessage > 30 min ago handled by cron
    // Process through state machine
    await processMessage(session as Parameters<typeof processMessage>[0], message);
  },
};

async function handleIdentification(phone: string, message: ParsedMessage): Promise<void> {
  if (!message.text) {
    await whatsappService.sendText(phone, MESSAGES.ASK_CPF);
    return;
  }

  const cpf = normalizeCpf(message.text);

  if (cpf.length !== 11) {
    await whatsappService.sendText(phone, MESSAGES.ASK_CPF);
    return;
  }

  // Find user by CPF (all users, search encrypted)
  const users = await prisma.user.findMany({ where: { deletedAt: null } });
  const user = users.find((u) => {
    try {
      return decrypt(u.cpf) === cpf;
    } catch {
      return false;
    }
  });

  if (!user) {
    await whatsappService.sendText(phone, MESSAGES.CPF_NOT_FOUND(message.text.trim()));
    return;
  }

  if (user.status !== 'ACTIVE') {
    await whatsappService.sendText(phone, MESSAGES.CPF_INACTIVE);
    return;
  }

  // Create session + greet
  await sessionRepository.upsertSession(user.id, phone);
  await whatsappService.sendText(phone, MESSAGES.WELCOME(user.name));
  await whatsappService.sendText(phone, MENU_TEXT(user.name));
}
