# Source Tree — postai-dev-squad

Estrutura de referência para o projeto PostAI.

```
./
├── src/
│   ├── api/
│   │   ├── controllers/        # HTTP handlers (thin layer)
│   │   ├── middlewares/        # Auth, validation, rate-limit
│   │   └── routes/             # Route definitions
│   ├── services/               # Business logic
│   │   ├── whatsapp/           # WhatsApp integration (CIPHER)
│   │   │   ├── webhook.service.ts
│   │   │   ├── state-machine.service.ts
│   │   │   └── session.service.ts
│   │   ├── publishing/         # Multi-platform publish (VELOCITY)
│   │   │   ├── orchestrator.service.ts
│   │   │   ├── instagram.service.ts
│   │   │   ├── tiktok.service.ts
│   │   │   ├── linkedin.service.ts
│   │   │   └── youtube.service.ts
│   │   ├── auth/               # JWT, tokens (CIPHER)
│   │   └── billing/            # Stripe integration (HARMONY)
│   ├── repositories/           # Database access layer
│   │   ├── user.repository.ts
│   │   ├── post.repository.ts
│   │   └── session.repository.ts
│   ├── domain/                 # Domain types & interfaces
│   │   ├── user.ts
│   │   ├── post.ts
│   │   ├── platform.ts
│   │   └── state-machine.ts
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── redis.ts            # Redis client
│   │   ├── stripe.ts           # Stripe client
│   │   └── claude.ts           # Claude API client
│   └── utils/
│       ├── retry.ts            # Exponential backoff utility
│       ├── logger.ts           # Structured logging
│       └── errors.ts           # Error types
├── prisma/
│   ├── schema.prisma           # Database schema (CIPHER)
│   └── migrations/             # Migration files
├── n8n/
│   └── workflows/              # n8n workflow JSONs (VELOCITY)
├── infra/
│   ├── terraform/              # AWS IaC (NEXUS)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── modules/
│   └── docker/
│       ├── Dockerfile
│       └── docker-compose.yml
├── .github/
│   └── workflows/              # CI/CD pipelines (NEXUS)
│       ├── ci.yml
│       └── deploy.yml
├── tests/
│   ├── unit/                   # Unit tests (SENTINEL)
│   ├── integration/            # Integration tests (SENTINEL)
│   └── load/                   # k6 load scripts (SENTINEL)
└── docs/
    ├── architecture/           # ADRs e diagramas (ATLAS)
    ├── api/                    # OpenAPI spec
    ├── tracking-plan.md        # Métricas e eventos (INSIGHT)
    └── lgpd-compliance.md      # Compliance doc (HARMONY)
```
