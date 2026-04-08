---
task: Integrate YouTube
responsavel: "@velocity"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - youtube_data_api_config: API key, OAuth client ID/secret
Saida: |
  - youtube_client: Client TypeScript para YouTube Data API v3
  - shorts_uploader: Handler de upload de YouTube Shorts
Checklist:
  - "[ ] OAuth flow (youtube.upload scope)"
  - "[ ] Upload de vídeo (resumable upload)"
  - "[ ] Configuração de metadata (título, descrição, tags)"
  - "[ ] Configuração de privacidade (public/unlisted)"
  - "[ ] Rate limiting (10.000 quota units/day)"
  - "[ ] Retry em falha de upload"
  - "[ ] Polling de status de processamento"
  - "[ ] Testes com mock"
---

# *integrate-youtube

VELOCITY implementa upload de YouTube Shorts via YouTube Data API v3.

## Targets

- Resumable upload para vídeos grandes
- Polling de status até processamento completo
- Quota management (10k units/day)
