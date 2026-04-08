---
task: Integrate Instagram
responsavel: "@velocity"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - meta_graph_config: App ID, App Secret, access token scope
Saida: |
  - instagram_client: Client TypeScript para Meta Graph API
  - post_endpoint: Lógica de publicação (imagem, vídeo, carrossel)
Checklist:
  - "[ ] OAuth flow para conexão de conta"
  - "[ ] Publicar imagem (single)"
  - "[ ] Publicar vídeo (Reels)"
  - "[ ] Publicar carrossel"
  - "[ ] Rate limiting respeitado (200 calls/hour)"
  - "[ ] Retry com exponential backoff"
  - "[ ] Error handling por tipo de erro API"
  - "[ ] Testes de integração com mock"
---

# *integrate-instagram

VELOCITY implementa integração com Meta Graph API para publicação no Instagram.

## Targets

- Publicação em <2s (imagem)
- Retry: 3 tentativas, backoff 1s/2s/4s
- Rate limit: respeitar 200 calls/hour por token
