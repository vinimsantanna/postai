# PostAI — CI/CD Pipeline

## Visão Geral

```
PR aberto → CI (lint + typecheck + tests)
               ↓ aprovado
main push  → Deploy Staging (automático)
               ↓ validado
tag v*.*.* → Deploy Production (aprovação manual GitHub)
```

## Workflows

### ci.yml — Continuous Integration
**Trigger:** push em `main`/`develop` e pull_requests

| Step | Detalhe |
|------|---------|
| Lint | ESLint no `src/` |
| Typecheck | `tsc --noEmit` |
| Unit tests | Vitest + coverage |
| Integration tests | Vitest contra Postgres 15 local |
| Coverage report | Artifact `coverage-report` (7 dias) |

### deploy-staging.yml — Deploy Staging
**Trigger:** push em `main`

1. `railway up --environment staging --detach`
2. `railway run npm run migrate`
3. Health check: `GET /health` (retry 5x, delay 10s)
4. Rollback automático se health check falhar

### deploy-prod.yml — Deploy Production
**Trigger:** tag `v*.*.*`

**Requer:** aprovação manual no GitHub environment `production`

1. `railway up --environment production --detach`
2. `railway run npm run migrate`
3. Health check: `GET /health` (retry 10x, delay 15s)
4. Cria GitHub Release automático
5. Rollback automático se falhar

### rollback.yml — Rollback Manual
**Trigger:** `workflow_dispatch` (manual)

Inputs:
- `environment`: `staging` | `production`
- `deployment_id`: ID específico do Railway (opcional — omitir = anterior)

## Secrets necessários no GitHub

Configurar em **Settings → Secrets and variables → Actions**:

| Secret | Descrição |
|--------|-----------|
| `RAILWAY_TOKEN` | Token da conta Railway (`railway login --token`) |

## Variables necessárias

Configurar em **Settings → Secrets and variables → Actions → Variables**:

| Variable | Environment | Valor |
|----------|------------|-------|
| `STAGING_URL` | staging | `https://postai-staging.up.railway.app` |
| `PROD_URL` | production | `https://api.postai.app` |

## Railway — Setup Manual

### 1. Criar projeto no Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Criar projeto
railway init
```

### 2. Criar environments

No dashboard Railway: **New Environment** → `staging` + `production`

### 3. Configurar variáveis de ambiente

Para cada environment, adicionar as variáveis do `.env.example`:

```bash
# Via CLI
railway variables set DATABASE_URL="postgresql://..." --environment staging
railway variables set SUPABASE_URL="https://..." --environment staging
# ... etc
```

Ou via dashboard Railway: **Variables** → copiar do `.env.example`

### 4. Obter RAILWAY_TOKEN

```bash
railway whoami  # confirma login
# No dashboard: Account Settings → Tokens → New Token
```

Adicionar como secret no GitHub.

## Ambientes

| Environment | Branch/Trigger | URL | Aprovação |
|-------------|---------------|-----|-----------|
| staging | `main` push | railway.app subdomain | Automático |
| production | tag `v*.*.*` | `api.postai.app` | Manual GitHub |

## Fluxo de Release

```bash
# 1. Merge PR para main → staging deploy automático
# 2. Validar em staging
# 3. Criar tag de release
git tag -a v0.1.0 -m "MVP: WhatsApp bot + publicação multi-plataforma"
git push origin v0.1.0
# 4. Aprovar no GitHub → production deploy
```

## Health Check

O endpoint `GET /health` deve retornar `200 OK` com:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-04-08T12:00:00Z"
}
```

> Implementar em `src/api/routes/health.ts` (story 3.1 ou prior task)
