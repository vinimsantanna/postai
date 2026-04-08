import axios from 'axios';

function getConfig() {
  return {
    url: process.env.EVOLUTION_API_URL!,
    key: process.env.EVOLUTION_API_KEY!,
    instance: process.env.EVOLUTION_INSTANCE!,
  };
}

export const whatsappService = {
  async sendText(to: string, text: string): Promise<void> {
    const { url, key, instance } = getConfig();
    await axios.post(
      `${url}/message/sendText/${instance}`,
      { number: to, textMessage: { text } },
      { headers: { apikey: key } },
    );
  },

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
    const { url, key, instance } = getConfig();
    await axios.post(
      `${url}/message/sendMedia/${instance}`,
      {
        number: to,
        mediaMessage: {
          mediatype: 'image',
          media: imageUrl,
          caption: caption ?? '',
        },
      },
      { headers: { apikey: key } },
    );
  },

  async configureWebhook(webhookUrl: string): Promise<void> {
    const { url, key, instance } = getConfig();
    await axios.post(
      `${url}/webhook/set/${instance}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: ['messages.upsert'],
        },
      },
      { headers: { apikey: key } },
    );
  },
};
