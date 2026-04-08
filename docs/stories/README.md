# PostAI — User Stories

**Personas:**
- **Diego** — Digital creator / influencer (TikTok, Instagram)
- **Carlos** — SMB owner (multi-canal)
- **Marina** — Gestora de agência de social media (múltiplos clientes)

---

## Epic 1 — WhatsApp Bot & Autenticação (@cipher)

| Story | Título | Prioridade | Esforço | Status |
|-------|--------|------------|---------|--------|
| [1.1](1.1.story.md) | Identificação por CPF no WhatsApp | P0 | M | To Do |
| [1.2](1.2.story.md) | Menu Principal e State Machine | P0 | M | To Do |
| [1.3](1.3.story.md) | Seleção de Cliente (Agência) | P0 | M | To Do |

## Epic 2 — Publicação Multi-plataforma (@velocity)

| Story | Título | Prioridade | Esforço | Status |
|-------|--------|------------|---------|--------|
| [2.1](2.1.story.md) | Publicar Conteúdo em Todas as Plataformas | P0 | L | To Do |
| [2.2](2.2.story.md) | Publicação para Cliente Específico (Agência) | P0 | S | To Do |
| [2.3](2.3.story.md) | Selecionar Plataformas para Publicação | P1 | S | To Do |

## Epic 3 — Onboarding & Web App (@cipher + @velocity)

| Story | Título | Prioridade | Esforço | Status |
|-------|--------|------------|---------|--------|
| [3.1](3.1.story.md) | Cadastro de Usuário (Web App) | P0 | M | To Do |
| [3.2](3.2.story.md) | Conectar Redes Sociais (OAuth) | P0 | L | To Do |
| [3.3](3.3.story.md) | Cadastro de Clientes pela Agência | P0 | M | To Do |

## Epic 4 — Billing & Monetização (@harmony)

| Story | Título | Prioridade | Esforço | Status |
|-------|--------|------------|---------|--------|
| [4.1](4.1.story.md) | Planos e Assinatura (Billing) | P0 | M | To Do |

## Epic 5 — Histórico & Analytics (@velocity)

| Story | Título | Prioridade | Esforço | Status |
|-------|--------|------------|---------|--------|
| [5.1](5.1.story.md) | Histórico de Publicações | P1 | S | To Do |

---

## Backlog P0 (Sprint 1 MVP)

Ordem recomendada de desenvolvimento:

```
1. Story 3.1 → Cadastro de usuário
2. Story 4.1 → Billing (sem conta ativa, sem bot)
3. Story 3.2 → OAuth redes sociais
4. Story 1.1 → Identificação por CPF
5. Story 1.2 → State Machine + Menu
6. Story 2.1 → Publicação multi-plataforma
7. Story 3.3 → Clientes de agência (paralelo com 3.2)
8. Story 1.3 → Seleção de cliente no bot
9. Story 2.2 → Publicação no contexto do cliente
```
