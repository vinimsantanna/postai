# postai-dev-squad

Squad AIOX de 10 agentes sênior para desenvolvimento do MVP PostAI.

## Missão

Construir o PostAI — SaaS que permite criadores de conteúdo publicar em 4 plataformas simultaneamente via WhatsApp bot, em 8 semanas, escalando de 1k→100k usuários.

## Produto

**PostAI:** Usuário envia conteúdo pelo WhatsApp → state machine processa → publica em Instagram, TikTok, LinkedIn e YouTube em <5 segundos.

## Agentes

| Agente | Persona | Especialidade |
|--------|---------|---------------|
| `@atlas` | ATLAS | CTO/Tech Lead — arquitetura, code review, mentoria |
| `@nexus` | NEXUS | DevOps/Infra — AWS, Terraform, CI/CD, monitoring |
| `@cipher` | CIPHER | Backend Dev 1 — WhatsApp, state machine, PostgreSQL |
| `@velocity` | VELOCITY | Backend Dev 2 — integrações sociais, n8n, publicação paralela |
| `@sentinel` | SENTINEL | QA/Testing — unit, integration, load tests |
| `@insight` | INSIGHT | Product Manager — estratégia, user stories, métricas |
| `@aurora` | AURORA | UI/UX — conversational UI, design system, copy |
| `@catalyst` | CATALYST | Growth/Marketing — GTM, landing page, email funnel |
| `@harmony` | HARMONY | Operations — billing Stripe, LGPD, vendors, SOPs |
| `@echo` | ECHO | Customer Success — onboarding, suporte, NPS |

## Ordem padrão de trabalho

1. `@insight` — estratégia de produto e user stories
2. `@atlas` — arquitetura alinhada ao produto
3. `@nexus` — infraestrutura antes do dev começar
4. `@cipher` — backend core (WhatsApp + state machine)
5. `@velocity` — integrações de plataformas sociais
6. `@aurora` — design (paralelo ao backend)
7. `@sentinel` — QA gates por feature
8. `@harmony` — ops (paralelo)
9. `@catalyst` — preparação GTM
10. `@echo` — customer success para beta

## Gates de aprovação

| Gate | Aprovador | Escopo |
|------|-----------|--------|
| Arquitetura | `@atlas` | Toda feature antes do merge |
| Segurança | `@nexus` | Infra e auth |
| Qualidade | `@sentinel` | >80% coverage obrigatório |
| Produto | `@insight` | Acceptance criteria |
| Compliance LGPD | `@harmony` | Dados de usuário |

## Tech Stack

- **Backend:** Node.js / TypeScript
- **Database:** PostgreSQL
- **WhatsApp:** Evolution API
- **Orquestração:** n8n
- **Cloud:** AWS (EC2, RDS, S3, CloudFront)
- **IaC:** Terraform
- **APIs Sociais:** Instagram, TikTok, LinkedIn, YouTube
- **Billing:** Stripe
- **AI:** Claude API

## Como usar

```bash
# Copiar squad para um projeto
cp -r ~/squads/postai-dev-squad ./squads/

# Ativar agentes
@atlas     → *design-architecture
@cipher    → *integrate-whatsapp
@velocity  → *orchestrate-parallel-publish
```

## Performance targets

- Publicação em 4 plataformas: <5 segundos
- Usuários simultâneos: 1.000
- Uptime: 99.99%
- API latency: <100ms
- Test coverage: >80%

## Autor

Vinicius Santanna
