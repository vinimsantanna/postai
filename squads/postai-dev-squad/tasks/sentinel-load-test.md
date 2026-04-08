---
task: Load Test
responsavel: "@sentinel"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - target_users: Número de usuários simultâneos (default: 1000)
  - endpoints: Endpoints críticos a testar
Saida: |
  - load_report: Relatório com latências, throughput e errors
  - bottlenecks: Gargalos identificados com sugestões
Checklist:
  - "[ ] Script k6 para WhatsApp webhook"
  - "[ ] Script k6 para publish endpoint"
  - "[ ] Script k6 para auth endpoints"
  - "[ ] Ramp up gradual: 100→500→1000 usuários"
  - "[ ] Medir p50, p95, p99 latência"
  - "[ ] Identificar breaking point"
  - "[ ] Reportar gargalos para ATLAS/NEXUS"
---

# *load-test

SENTINEL executa load tests para validar targets de performance com 1000 usuários simultâneos.

## Targets a validar

- API latency: p95 < 100ms, p99 < 200ms
- Error rate: < 0.1%
- Throughput: > 500 req/s
- WhatsApp webhook: < 50ms (p95)
