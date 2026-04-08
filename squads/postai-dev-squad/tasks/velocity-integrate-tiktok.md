---
task: Integrate TikTok
responsavel: "@velocity"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - tiktok_api_config: Client key, client secret, redirect URI
Saida: |
  - tiktok_client: Client TypeScript para TikTok API
  - upload_handler: Handler de upload de vídeo
Checklist:
  - "[ ] OAuth flow (Content Posting API)"
  - "[ ] Upload de vídeo (chunked upload)"
  - "[ ] Configuração de privacidade"
  - "[ ] Rate limiting (TikTok API quotas)"
  - "[ ] Retry em falha de upload"
  - "[ ] Polling de status de publicação"
  - "[ ] Testes com mock"
---

# *integrate-tiktok

VELOCITY implementa upload de vídeo para TikTok via Content Posting API.

## Targets

- Upload assíncrono com polling de status
- Suporte a vídeos até 60 segundos
- Retry em falha de chunked upload
