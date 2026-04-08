---
task: Create Email Funnel
responsavel: "@catalyst"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - user_stage: Estágio do usuário (signup | onboarding | ativação | retenção | winback)
  - triggers: Eventos que disparam cada email
Saida: |
  - email_sequences: Conteúdo de cada email da sequência
  - automation_config: Configuração de triggers e delays
Checklist:
  - "[ ] Welcome sequence (3 emails)"
  - "[ ] Onboarding sequence (guia para primeiro post)"
  - "[ ] Ativação (usuário que não postou em 3 dias)"
  - "[ ] Engagement (features não descobertas)"
  - "[ ] Win-back (usuário inativo 14 dias)"
---

# *create-email-funnel

CATALYST cria sequências de email automatizadas para cada estágio do usuário.

## Sequências

1. **Welcome** (3 emails, 0/1/3 dias): Boas-vindas, primeiros passos, dica de plataforma
2. **Onboarding** (trigger: signup sem primeiro post): Guia passo a passo
3. **Ativação** (trigger: 3 dias sem post): Lembrete + dica de conteúdo
4. **Win-back** (trigger: 14 dias inativo): Novidades + oferta especial
