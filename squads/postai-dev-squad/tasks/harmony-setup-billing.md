---
task: Setup Billing
responsavel: "@harmony"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - pricing_tiers: Tiers de preço (free, starter, pro, agency)
  - stripe_config: Stripe account, webhook endpoint
Saida: |
  - billing_system: Setup Stripe completo
  - subscription_flows: Fluxos de assinatura, upgrade, downgrade, cancelamento
Checklist:
  - "[ ] Criar products e prices no Stripe"
  - "[ ] Implementar Stripe Checkout"
  - "[ ] Configurar webhooks Stripe (payment_intent, subscription)"
  - "[ ] Fluxo de upgrade/downgrade de plan"
  - "[ ] Fluxo de cancelamento (with churn prevention)"
  - "[ ] Payment retry logic"
  - "[ ] Invoice generation automática"
  - "[ ] Testar em Stripe test mode"
---

# *setup-billing

HARMONY configura sistema de billing completo via Stripe.

## Tiers sugeridos

- **Free:** 3 posts/mês, 2 plataformas
- **Starter:** 30 posts/mês, 4 plataformas
- **Pro:** Ilimitado, 4 plataformas + analytics
- **Agency:** Multi-conta, white-label
