---
task: Design Database Schema
responsavel: "@cipher"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - entities: Entidades do domínio (User, Post, Platform, Session, Subscription)
  - relationships: Relacionamentos entre entidades
Saida: |
  - migrations: Arquivos de migration Prisma
  - schema_docs: Documentação do schema com descrição de cada tabela/campo
Checklist:
  - "[ ] Modelar tabela users"
  - "[ ] Modelar tabela posts e post_platforms"
  - "[ ] Modelar tabela sessions (state machine)"
  - "[ ] Modelar tabela subscriptions (Stripe)"
  - "[ ] Modelar tabela publish_logs (auditoria)"
  - "[ ] Soft delete (deleted_at) em todas as tabelas"
  - "[ ] Índices para campos de busca frequente"
  - "[ ] Migrations geradas e testadas"
---

# *design-database-schema

CIPHER projeta o schema PostgreSQL e gera migrations Prisma.

## Tabelas principais

- `users` — Dados do usuário (LGPD compliant)
- `sessions` — Estado da conversa WhatsApp
- `posts` — Conteúdo a ser publicado
- `post_platforms` — Resultado por plataforma
- `subscriptions` — Assinatura Stripe
- `publish_logs` — Log de auditoria completo

## Princípios

- Soft delete em todas as tabelas (LGPD)
- Timestamps created_at / updated_at / deleted_at
- UUIDs como PKs
