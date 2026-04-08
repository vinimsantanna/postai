# ADR-002 — Supabase ao invés de AWS RDS no MVP

**Data:** 2026-04-08  
**Status:** Aceito  
**Autor:** @atlas

## Contexto

O PostAI precisa de um banco PostgreSQL gerenciado. A stack original previa AWS RDS, mas para o MVP o custo é proibitivo (~R$150/mês só para o banco).

## Decisão

Usar **Supabase** no MVP como camada de banco de dados.

## Opções analisadas

| Critério | Supabase | AWS RDS | PlanetScale |
|---------|----------|---------|-------------|
| Custo MVP | R$0 (free 500MB) | ~R$150/mês | R$0 (free) |
| PostgreSQL | ✅ Nativo | ✅ Nativo | ❌ MySQL apenas |
| Prisma | ✅ 100% | ✅ 100% | ✅ (limitado) |
| Storage built-in | ✅ 1GB free | ❌ S3 separado | ❌ |
| Auth built-in | ✅ (opcional usar) | ❌ | ❌ |
| Migração para RDS | ✅ pg_dump + DATABASE_URL | N/A | ❌ incompatível |
| Backups automáticos | ✅ Free tier 1 backup/dia | ✅ configurável | ✅ |

## Consequências

**Positivas:**
- R$0 de custo de banco no MVP
- Supabase Storage elimina necessidade de S3 (vídeos, thumbnails)
- Migração futura é trivial: `pg_dump`, troca de `DATABASE_URL`, `npx prisma migrate deploy`
- Dashboard visual facilita debugging em desenvolvimento

**Negativas:**
- Free tier: 500MB de storage de dados (suficiente para ~50k usuários com dados mínimos)
- Free tier pausa o projeto após 1 semana sem acesso (inativo) — não é problema em produção
- Supabase Storage free: 1GB (suficiente para ~200 vídeos de 5MB)

## Gatilho de migração para RDS

Migrar quando qualquer uma destas condições for atingida:
- Database storage > 400MB (80% do free tier)
- Necessidade de read replicas
- SLA de uptime 99.99% obrigatório por contrato com cliente
- Custo do Supabase Pro ($25/mês) for equivalente ao RDS t3.micro
