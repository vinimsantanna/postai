export const MESSAGES = {
  WELCOME: (name: string) =>
    `Olá, *${name}*! 👋 Bem-vindo ao PostAI.\n\nPublique em todas as suas redes sociais direto pelo WhatsApp! ✨`,

  ASK_COPY: '✍️ Ótimo! Me manda a *legenda* do seu post (texto completo com hashtags):',

  ASK_SCHEDULED_COPY: '⏰ Vamos agendar! Me manda a *legenda* do post:',

  ASK_MEDIA_TYPE:
    '📸 O que você quer publicar?\n\n1️⃣ Vídeo\n2️⃣ Foto\n\nDigite *1* ou *2*:',

  ASK_VIDEO:
    '🎬 Me manda o *vídeo* que você quer publicar:\n\n_(Para melhor qualidade, envie como *documento*)_',

  ASK_PHOTO: '📸 Me manda a *foto* que você quer publicar:',

  ASK_COVER_PHOTO:
    '🖼️ Quer enviar uma *foto de capa* para o vídeo? (Opcional — mande a foto ou escreva "pular"):',

  COPY_TOO_SHORT: '❌ A legenda precisa ter pelo menos 3 caracteres. Tente novamente:',

  VIDEO_REQUIRED: '❌ Por favor, envie um *vídeo* (não texto ou imagem).\n\n_(Dica: envie como *documento* para manter a qualidade máxima)_',

  PHOTO_REQUIRED: '❌ Por favor, envie uma *foto*:',

  MEDIA_TYPE_INVALID: '❌ Opção inválida. Digite *1* para vídeo ou *2* para foto:',

  ASK_COLLAB:
    '🤝 Quer marcar um *colaborador* (collab)? O post aparecerá no perfil dele também.\n\nMande o *@username* do colaborador ou escreva *"não"* para pular:',

  VIDEO_LARGE_WARNING:
    '⏳ Vídeo recebido! Estamos processando e publicando...\n\n_Vídeos maiores podem levar alguns minutos. Você receberá uma confirmação quando estiver no ar!_',

  PUBLISHING_STARTED:
    '🚀 *Publicando!*\n\nEstou publicando em todas as suas redes agora. Você receberá uma confirmação com os links em breve!',

  PUBLISH_CANCELLED: '❌ Publicação cancelada.',

  HISTORY_LOADING: '📊 Buscando seu histórico...',

  HISTORY_EMPTY: 'Você ainda não tem publicações. Use a opção *1* para publicar agora!',

  SELECT_CLIENT_INVALID: '❌ Por favor, escolha um número válido da lista de clientes.',

  SELECT_CLIENT_PROMPT: (clients: Array<{ index: number; name: string; platforms: string[] }>) => {
    const lines = ['👥 *Selecione o cliente:*', ''];
    for (const c of clients) {
      const platforms = c.platforms.length > 0 ? c.platforms.join(', ') : 'sem plataformas';
      lines.push(`${c.index}. ${c.name} — ${platforms}`);
    }
    lines.push('', 'Digite o *número* do cliente:');
    return lines.join('\n');
  },

  NO_CLIENTS_ONBOARD:
    '👥 Você ainda não tem clientes cadastrados.\n\nVamos cadastrar o primeiro agora! Como se chama o cliente?',

  CREATE_CLIENT_CONFIRM: (name: string) =>
    `✅ Cadastrar cliente *${name}*?\n\nDigite *confirmar* para salvar ou *cancelar* para desistir.`,

  CREATE_CLIENT_SUCCESS: (name: string) =>
    `✅ Cliente *${name}* cadastrado com sucesso!\n\n⚠️ Lembre-se de conectar as plataformas dele em *postai.app/settings* para poder publicar.`,

  CLIENT_SELECTED: (name: string, platforms: string[]) =>
    platforms.length > 0
      ? `✅ *${name}* selecionado.\n📱 Plataformas: ${platforms.join(', ')}`
      : `✅ *${name}* selecionado.\n⚠️ Nenhuma plataforma conectada. Acesse *postai.app/settings* para conectar.`,

  ERROR_GENERAL:
    '⚠️ Algo deu errado. Por favor, tente novamente ou comece do menu principal digitando *menu*.',

  ASK_SCHEDULE_DATE:
    '📅 Para quando você quer agendar?\n\nExemplos:\n• amanhã 18h\n• 10/04 14:30\n• próxima segunda 9h',

  INVALID_DATE:
    '⚠️ Data inválida ou no passado. Informe uma data futura.\n\nExemplos: *amanhã 18h*, *10/04 14:30*, *próxima segunda 9h*',

  UNREGISTERED:
    '👋 Olá! Para usar o PostAI, você precisa criar sua conta em *postai.app*.\n\nApós o cadastro, volte aqui e envie seu CPF para começar!',

  ASK_CPF:
    'Bem-vindo ao PostAI! 🚀\n\nPara identificar sua conta, me informe seu *CPF* (apenas números):',

  CPF_NOT_FOUND: (cpf: string) =>
    `❌ CPF *${cpf}* não encontrado.\n\nAcesse *postai.app* para criar sua conta ou verifique o CPF digitado.`,

  CPF_INACTIVE: '⚠️ Sua conta está inativa. Verifique sua assinatura em *postai.app*.',
};

export function MENU_TEXT(name: string, isAgency = false): string {
  const lines = [
    `Olá, *${name}*! O que você quer fazer? 👇`,
    '',
    '1️⃣ Publicar agora',
    '2️⃣ Agendar publicação',
    '3️⃣ Ver histórico',
  ];
  if (isAgency) lines.push('0️⃣ Trocar cliente');
  return lines.join('\n');
}
