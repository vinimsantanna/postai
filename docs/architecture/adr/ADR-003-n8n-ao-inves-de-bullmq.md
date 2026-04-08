# ADR-003 — n8n ao invés de BullMQ para publicação no MVP

**Data:** 2026-04-08  
**Status:** Aceito  
**Autor:** @atlas

## Contexto

A publicação paralela em 4 plataformas requer um sistema de jobs/queues. A stack original previa BullMQ + Redis. Para o MVP, ambos adicionam custo e complexidade desnecessários.

## Decisão

Usar **n8n** (Cloud free tier) para orquestrar publicação, agendamento e retry no MVP.

## Opções analisadas

| Critério | n8n Cloud | BullMQ + Redis | Execução direta no backend |
|---------|-----------|----------------|--------------------------|
| Custo MVP | R$0 (5k execuções) | ~R$80/mês (Redis) | R$0 |
| Paralelismo | ✅ Branches paralelas | ✅ Worker concurrency | ✅ Promise.allSettled |
| Retry automático | ✅ Built-in | ✅ Configurável | ❌ Manual |
| Agendamento | ✅ Wait node | ✅ Delayed jobs | ❌ Cron manual |
| Observabilidade | ✅ Dashboard visual | ⚠️ Bull Board extra | ❌ Só logs |
| Cancelamento de jobs | ✅ via webhook | ✅ queue.remove() | ❌ |
| Latência adicional | ~1–2s | <100ms | <100ms |
| Migração futura | Gradual | N/A | N/A |

## Por que não execução direta no backend?

Sem queue, um restart do servidor perderia todas as publicações em andamento. Com n8n, o estado persiste externamente — o backend pode reiniciar sem perder jobs.

## Consequências

**Positivas:**
- R$0 de queue no MVP
- Dashboard visual para debugar publicações falhas
- Retry e agendamento sem código extra no backend
- 5.000 execuções/mês = ~167/dia = suficiente para ~300 usuários publicando 1x/dia

**Negativas:**
- Latência adicional de 1–2s (aceitável: SLA é < 5s, não < 1s)
- Dependência de serviço externo (n8n Cloud) para funcionalidade core
- Free tier: 5 workflows ativos e 5.000 execuções/mês

## Gatilho de migração para BullMQ

Migrar quando qualquer uma destas condições for atingida:
- n8n execuções > 4.000/mês (80% do free tier)
- Latência de publicação precisa ser < 1s
- Custo do n8n Starter ($20/mês) for inaceitável vs. custo de implementar BullMQ
- Necessidade de >5 workflows ativos simultâneos

## Estratégia de migração

O `publisher.service.ts` abstrai a chamada ao n8n via interface `IPublishQueue`. Para migrar:
1. Implementar `BullMQPublishQueue` na mesma interface
2. Trocar a injeção de dependência
3. Zero mudança nos controllers ou state machine
