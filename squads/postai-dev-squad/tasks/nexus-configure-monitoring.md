---
task: Configure Monitoring
responsavel: "@nexus"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - services: Lista de serviços a monitorar
Saida: |
  - dashboards: Dashboards configurados (CloudWatch/DataDog)
  - alerts: Alertas com thresholds e ações
  - runbooks: Runbooks para cada tipo de incidente
Checklist:
  - "[ ] Dashboard de saúde geral da aplicação"
  - "[ ] Alertas de CPU/memória/disco"
  - "[ ] Alertas de latência e error rate"
  - "[ ] Monitoring de WhatsApp webhook reliability"
  - "[ ] Monitoring de publicações por plataforma"
  - "[ ] Runbook para cada alerta crítico"
  - "[ ] Sentry para error tracking"
---

# *configure-monitoring

NEXUS configura observabilidade completa: métricas, logs, alertas e runbooks.

## Métricas-chave

- API latency (p50, p95, p99)
- Error rate por endpoint
- WhatsApp webhook success rate
- Publish success rate por plataforma
- Database connection pool utilization
- Queue depth (BullMQ)

## Alertas críticos (pager)

- Error rate > 1% por 5 min
- Latency p99 > 500ms
- Webhook failures > 5%
- Database down
