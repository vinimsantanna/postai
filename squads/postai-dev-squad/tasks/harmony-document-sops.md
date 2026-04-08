---
task: Document SOPs
responsavel: "@harmony"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - process_name: Nome do processo a documentar
Saida: |
  - sop_doc: Standard Operating Procedure completo
  - checklists: Checklists para execução e verificação
Checklist:
  - "[ ] Descrever objetivo do processo"
  - "[ ] Listar pré-condições"
  - "[ ] Documentar passos em ordem"
  - "[ ] Incluir decisões e ramificações"
  - "[ ] Definir responsável"
  - "[ ] Incluir checklist de verificação"
---

# *document-sops

HARMONY documenta SOPs para processos críticos do PostAI.

## SOPs prioritários

1. Incident response (sistema fora do ar)
2. Security breach response
3. Usuário solicita exclusão de dados (LGPD)
4. Vendor crítico indisponível
5. Deploy de emergência (hotfix)
6. Backup e restore de banco de dados
7. Onboarding de novo usuário beta
8. Cancelamento de conta (churn)
9. Renovação de credenciais de API
10. Cobrança com falha (Stripe)
