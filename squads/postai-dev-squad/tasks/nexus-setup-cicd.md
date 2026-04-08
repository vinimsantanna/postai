---
task: Setup CI/CD
responsavel: "@nexus"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - repo: Repositório GitHub
  - environments: Ambientes (staging, production)
Saida: |
  - github_actions_config: Workflows de CI e CD
  - pipeline_docs: Documentação do pipeline
Checklist:
  - "[ ] CI: lint, typecheck, testes"
  - "[ ] Build Docker image + push ECR"
  - "[ ] Deploy automático para staging (main branch)"
  - "[ ] Deploy manual para production (tag release)"
  - "[ ] Rollback automático em falha"
  - "[ ] Notificações de deploy (Slack/email)"
---

# *setup-cicd

NEXUS configura pipeline GitHub Actions com CI completo e CD para staging/production.

## Pipelines

- `ci.yml` → lint + typecheck + tests + coverage report
- `deploy-staging.yml` → push to main → deploy staging
- `deploy-prod.yml` → tag release → deploy production (manual approval)
- `rollback.yml` → rollback para versão anterior
