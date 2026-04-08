---
task: Onboard Beta Users
responsavel: "@echo"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - user_list: Lista de usuários beta convidados
  - onboarding_flow: Fluxo de onboarding definido (de AURORA/HARMONY)
Saida: |
  - onboarding_report: Relatório de progresso por usuário
  - completion_rate: % de usuários que completaram o primeiro post
Checklist:
  - "[ ] Enviar email de boas-vindas personalizado"
  - "[ ] Agendar walkthrough individual (se necessário)"
  - "[ ] Acompanhar primeiro post de cada usuário"
  - "[ ] Check-in no dia 3"
  - "[ ] Coletar feedback inicial"
  - "[ ] Resolver bloqueios rapidamente"
  - "[ ] Registrar insights para INSIGHT"
---

# *onboard-beta-users

ECHO garante que 100% dos beta users façam o primeiro post em 24 horas.

## Meta

- 100% postam em 24h
- 80% publicam em 3+ plataformas
- NPS inicial > 4.5/5
- 0 bugs críticos não reportados
