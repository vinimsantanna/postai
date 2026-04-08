# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o Projeto

**PostAI** — SaaS que permite criadores de conteúdo publicar em Instagram, TikTok, LinkedIn e YouTube simultaneamente via WhatsApp bot.

**MVP target:** 8 semanas | **Stack:** Node.js/TypeScript + PostgreSQL + Evolution API + n8n + AWS

## Comandos de Desenvolvimento

```bash
npm run dev          # Start servidor de desenvolvimento
npm run build        # Build para produção
npm run test         # Rodar todos os testes
npm run test:unit    # Apenas testes unitários
npm run test:int     # Apenas testes de integração
npm run test:load    # Load tests (k6)
npm run lint         # ESLint + Prettier check
npm run typecheck    # TypeScript type check
npm run migrate      # Rodar migrations Prisma
npm run migrate:dev  # Migrations em dev com reset
```

## Squad AIOX

O projeto usa o `postai-dev-squad` com 10 agentes especializados.

**Ativar agentes:**
```
@atlas    → Arquitetura e code review
@nexus    → Infra AWS e CI/CD
@cipher   → WhatsApp integration e state machine
@velocity → Integrações sociais e n8n
@sentinel → QA e testes
@insight  → Product e user stories
@aurora   → UX e conversational design
@catalyst → Growth e GTM
@harmony  → Ops, billing e LGPD
@echo     → Customer success e NPS
```

**Ordem de trabalho:** INSIGHT → ATLAS → NEXUS → CIPHER → VELOCITY → AURORA → SENTINEL → HARMONY → CATALYST → ECHO

## Estrutura

```
postai/
├── src/                    # Código-fonte Node.js/TypeScript
│   ├── api/                # Controllers, middlewares, routes
│   ├── services/           # Business logic
│   │   ├── whatsapp/       # WhatsApp + state machine (CIPHER)
│   │   └── publishing/     # Integrações sociais (VELOCITY)
│   ├── repositories/       # Database access (Prisma)
│   ├── domain/             # Types e interfaces
│   └── lib/                # Clientes externos (Prisma, Redis, Stripe)
├── prisma/                 # Schema e migrations
├── infra/terraform/        # IaC AWS (NEXUS)
├── tests/                  # Testes (SENTINEL)
├── docs/
│   ├── stories/            # Stories de desenvolvimento (AIOX SDC)
│   ├── prd/                # Product requirements
│   └── architecture/       # ADRs e diagramas (ATLAS)
└── squads/postai-dev-squad/ # Agentes AIOX do projeto
```

## Gates de aprovação (obrigatórios)

| Gate | Aprovador | Quando |
|------|-----------|--------|
| Arquitetura | `@atlas` | Antes de qualquer merge |
| Segurança | `@nexus` | PRs com auth/infra |
| Qualidade | `@sentinel` | >80% coverage obrigatório |
| Produto | `@insight` | Acceptance criteria atendidos |
| LGPD | `@harmony` | Features com dados de usuário |

## Fluxo SDC (Story Development Cycle)

```
@insight *write-user-stories →
@atlas *design-architecture →
@cipher/*velocity *develop →
@sentinel *write-unit-tests →
@atlas *review-code →
merge
```

## Performance targets

- API latency: p95 < 100ms
- Publicação 4 plataformas: < 5 segundos
- Usuários simultâneos: 1.000
- Test coverage: > 80%
- Uptime: 99.99%
