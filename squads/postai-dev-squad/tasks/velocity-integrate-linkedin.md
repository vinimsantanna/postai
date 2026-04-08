---
task: Integrate LinkedIn
responsavel: "@velocity"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - linkedin_api_config: Client ID, client secret, OAuth scopes
Saida: |
  - linkedin_client: Client TypeScript para LinkedIn API v2
  - post_endpoint: Lógica de publicação (texto, imagem, artigo)
Checklist:
  - "[ ] OAuth flow (w_member_social scope)"
  - "[ ] Publicar post de texto"
  - "[ ] Publicar post com imagem"
  - "[ ] Rate limiting (100 requests/day por usuário)"
  - "[ ] Retry com backoff"
  - "[ ] Testes com mock"
---

# *integrate-linkedin

VELOCITY implementa publicação no LinkedIn via API v2.

## Targets

- Posts de texto e imagem
- Rate limit conservador (100 calls/day)
- Graceful degradation se limite atingido
