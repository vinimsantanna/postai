---
task: Implement State Machine
responsavel: "@cipher"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - conversation_flows: Diagramas de fluxo (vindo de AURORA)
Saida: |
  - state_machine_code: Implementação da state machine em TypeScript
  - flow_diagrams: Diagramas de estado atualizados
Checklist:
  - "[ ] Modelar estados (idle, collecting_content, confirming, publishing)"
  - "[ ] Definir transições com guards e ações"
  - "[ ] Persistência de estado em Redis (sessão ativa)"
  - "[ ] Persistência em PostgreSQL (histórico)"
  - "[ ] Timeout de sessão: 30 min de inatividade"
  - "[ ] Rollback em falha de publicação"
  - "[ ] Testes unitários para cada transição"
---

# *implement-state-machine

CIPHER implementa a state machine conversacional que gerencia o fluxo completo do bot.

## Estados principais

```
idle → collecting_content → collecting_platforms →
confirming_publish → publishing → published | publish_error
```

## Persistência

- Redis: estado ativo da sessão (TTL 30 min)
- PostgreSQL: histórico completo de conversas
