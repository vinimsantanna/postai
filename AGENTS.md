# AGENTS.md - PostAI (Codex CLI)

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga os gates de aprovação definidos em `squads/postai-dev-squad/squad.yaml`
2. Trabalhe por stories em `docs/stories/`
3. Não invente requisitos fora do PRD e das stories
4. Todo código precisa de testes (>80% coverage)
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- `npm run lint` — ESLint + Prettier
- `npm run typecheck` — TypeScript strict
- `npm run test` — suite completa
- `@atlas *review-code` — code review antes de merge
- `@sentinel *write-unit-tests` — coverage > 80%
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Source code: `src/`
- Database schema: `prisma/`
- Infrastructure: `infra/terraform/`
- Tests: `tests/`
- Stories: `docs/stories/`
- Squad agents: `squads/postai-dev-squad/agents/`
- Squad tasks: `squads/postai-dev-squad/tasks/`
<!-- AIOX-MANAGED-END: codebase -->

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

- `@atlas` → `squads/postai-dev-squad/agents/atlas.md`
- `@nexus` → `squads/postai-dev-squad/agents/nexus.md`
- `@cipher` → `squads/postai-dev-squad/agents/cipher.md`
- `@velocity` → `squads/postai-dev-squad/agents/velocity.md`
- `@sentinel` → `squads/postai-dev-squad/agents/sentinel.md`
- `@insight` → `squads/postai-dev-squad/agents/insight.md`
- `@aurora` → `squads/postai-dev-squad/agents/aurora.md`
- `@catalyst` → `squads/postai-dev-squad/agents/catalyst.md`
- `@harmony` → `squads/postai-dev-squad/agents/harmony.md`
- `@echo` → `squads/postai-dev-squad/agents/echo.md`
<!-- AIOX-MANAGED-END: shortcuts -->
