---
task: Run Integration Tests
responsavel: "@sentinel"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - services: Serviços a testar em conjunto
  - scenarios: Cenários de integração
Saida: |
  - test_results: Resultados por cenário
  - failures: Lista de falhas com contexto
Checklist:
  - "[ ] Testar fluxo WhatsApp → state machine → DB"
  - "[ ] Testar publicação (mock APIs sociais)"
  - "[ ] Testar auth flow completo"
  - "[ ] Testar billing flow (Stripe test mode)"
  - "[ ] Testar rollback em falha de publicação"
  - "[ ] Ambiente de teste isolado (test DB)"
---

# *run-integration-tests

SENTINEL executa testes de integração cobrindo os fluxos críticos end-to-end.

## Fluxos críticos (100% testados)

1. WhatsApp message → state machine → publish → notification
2. Register → login → connect platform → publish
3. Subscription → billing → access control
4. Publish failure → rollback → user notification
