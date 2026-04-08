import { getResend } from '@/lib/resend';

// Use onboarding@resend.dev until postai.app domain is verified in Resend
const FROM = 'PostAI <onboarding@resend.dev>';
const WHATSAPP_NUMBER = '+55 71 98303-0021';

export const emailService = {
  async sendWelcome(to: string, name: string): Promise<void> {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject: '🚀 Sua conta PostAI está ativa!',
      html: welcomeHtml(name),
    });
  },
};

function welcomeHtml(name: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <h1 style="font-size:24px;margin:0 0 8px">Olá, ${name}! 👋</h1>
    <p style="color:#555;margin:0 0 24px">Sua conta PostAI está ativa. Agora é só conectar no WhatsApp e começar a publicar!</p>

    <div style="background:#25d366;color:#fff;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px">
      <p style="margin:0 0 8px;font-size:14px;opacity:.9">Adicione este número no WhatsApp:</p>
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:1px">${WHATSAPP_NUMBER}</p>
      <p style="margin:8px 0 0;font-size:13px;opacity:.85">Salve como <strong>PostAI</strong></p>
    </div>

    <ol style="color:#333;padding-left:20px;margin:0 0 24px;line-height:1.8">
      <li>Adicione o número acima no WhatsApp</li>
      <li>Envie seu <strong>CPF</strong> (apenas números)</li>
      <li>Pronto — o bot vai te reconhecer e mostrar o menu 🎉</li>
    </ol>

    <p style="color:#888;font-size:12px;margin:0">Dúvidas? Responda este email.</p>
  </div>
</body>
</html>`;
}
