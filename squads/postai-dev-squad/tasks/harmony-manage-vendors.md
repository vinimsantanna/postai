---
task: Manage Vendors
responsavel: "@harmony"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - vendor: Nome do vendor
  - contract_type: Tipo de relação (API usage, SaaS, consultoria)
Saida: |
  - vendor_agreement: Contrato ou termos documentados
  - sla_doc: SLA esperado e plano de contingência
Checklist:
  - "[ ] Documentar custos e limites de cada vendor"
  - "[ ] Definir SLA esperado"
  - "[ ] Plano de contingência (vendor fora do ar)"
  - "[ ] Contato de suporte documentado"
  - "[ ] Alertas de custo configurados"
---

# *manage-vendors

HARMONY gerencia relacionamento com todos os vendors do PostAI.

## Vendors críticos

| Vendor | Tipo | Custo estimado | SLA |
|--------|------|---------------|-----|
| Evolution API | WhatsApp | ~$50-200/mês | 99.5% |
| AWS | Infra | ~$200-500/mês | 99.99% |
| n8n | Orquestração | ~$20-50/mês | 99.9% |
| Stripe | Billing | % por transação | 99.99% |
| Claude API | AI | Pay-per-use | 99.9% |
