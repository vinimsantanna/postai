---
task: Integrate WhatsApp
responsavel: "@cipher"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - evolution_api_config: URL, API key, instance name da Evolution API
Saida: |
  - webhook_handler: Endpoint que recebe e processa mensagens do WhatsApp
  - message_parser: Parser de mensagens (texto, mídia, botões)
Checklist:
  - "[ ] Configurar webhook receiver (POST /webhook/whatsapp)"
  - "[ ] Implementar verificação de assinatura HMAC"
  - "[ ] Parser para mensagens de texto"
  - "[ ] Parser para mídia (imagem, vídeo, áudio)"
  - "[ ] Parser para respostas de botões"
  - "[ ] Queue (BullMQ) para processamento assíncrono"
  - "[ ] Retry em falha de entrega"
  - "[ ] Testes de integração com mock Evolution API"
---

# *integrate-whatsapp

CIPHER implementa a integração completa com Evolution API, incluindo webhook receiver confiável e parser de mensagens.

## Endpoints

- `POST /webhook/whatsapp` — Recebe eventos da Evolution API
- `POST /api/messages/send` — Envia mensagens via Evolution API

## Targets

- Webhook reliability: 99.9%
- Processamento assíncrono via BullMQ
- Idempotência: mensagem duplicada não é processada duas vezes
