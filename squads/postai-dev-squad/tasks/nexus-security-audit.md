---
task: Security Audit
responsavel: "@nexus"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - scope: Escopo da auditoria (infra | app | full)
Saida: |
  - audit_report: Relatório com vulnerabilidades encontradas
  - vulnerabilities: Lista priorizada (CRITICAL/HIGH/MEDIUM/LOW)
  - fixes: Plano de remediação
Checklist:
  - "[ ] Revisar IAM roles e permissões (least privilege)"
  - "[ ] Verificar security groups e NACLs"
  - "[ ] Checar SSL/TLS configuration"
  - "[ ] Auditar secrets management"
  - "[ ] Verificar OWASP Top 10 no código"
  - "[ ] Checar dependências com vulnerabilidades (npm audit)"
  - "[ ] Validar compliance LGPD na infra"
---

# *security-audit

NEXUS audita segurança de infraestrutura e aplicação, gerando relatório priorizado com plano de remediação.

## Áreas auditadas

- AWS IAM (least privilege, sem wildcards)
- Network security (VPC, security groups)
- Secrets (nenhum hardcoded, tudo no Secrets Manager)
- SSL/TLS (grade A no SSL Labs)
- Dependências (0 CVEs críticos)
- LGPD (dados de usuário protegidos)
