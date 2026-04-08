# Coding Standards — postai-dev-squad

## Princípios gerais

- Código legível > código inteligente
- Testado > não testado (>80% coverage obrigatório)
- Simples > complexo
- Documentado onde não for óbvio

## TypeScript

- Strict mode sempre ativo (`"strict": true`)
- Sem `any` sem justificativa documentada
- Interfaces para tipos de domínio, types para utilitários
- Enums para estados fixos (ex: plataformas, status)

## Arquitetura

- Separação clara: `controllers/` → `services/` → `repositories/`
- Injeção de dependência para facilitar testes
- Erros como valores (Result pattern recomendado)
- Sem lógica de negócio em controllers

## APIs

- REST para endpoints externos
- Respostas padronizadas: `{ data, error, meta }`
- HTTP status codes semanticamente corretos
- Versionamento via path: `/api/v1/`

## Banco de dados

- Migrations via Prisma, nunca manual
- Nunca deletar dados (soft delete com `deleted_at`)
- Queries com timeout explícito
- Índices para todos os campos de busca

## WhatsApp / State Machine

- Estados imutáveis — transições explícitas e documentadas
- Persistência de sessão obrigatória (Redis + PostgreSQL)
- Timeout de sessão: 30 minutos de inatividade
- Rollback automático em falha de publicação

## Integrações externas

- Retry com exponential backoff (max 3 tentativas)
- Rate limit respeitado — nunca ignore `429`
- Credenciais sempre via AWS Secrets Manager
- Timeout de conexão: 10s; timeout de resposta: 30s

## Segurança

- HTTPS obrigatório
- Inputs sanitizados e validados (Zod)
- Sem secrets em código ou logs
- JWT com expiração de 1h + refresh token de 7d
- LGPD: nenhum dado sensível em logs

## Testes

- Unit: mínimo 80% coverage nos services e utils
- Integration: todos os fluxos críticos (WhatsApp → publish)
- Load: 1000 usuários simultâneos sem degradação
- Testes de erro são tão importantes quanto happy path

## Git

- Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- Feature branches: `feature/postai-{descrição}`
- PRs pequenos e focados
- Code review obrigatório por ATLAS antes de merge
