---
task: Prioritize Backlog
responsavel: "@insight"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - stories: Lista de stories não priorizadas
  - sprint_capacity: Capacidade do sprint (story points ou dias)
Saida: |
  - prioritized_backlog: Backlog ordenado por prioridade
  - sprint_plan: Stories selecionadas para o próximo sprint
Checklist:
  - "[ ] Aplicar framework: valor × esforço × risco"
  - "[ ] Garantir P0 no topo"
  - "[ ] Balancear capacidade do sprint"
  - "[ ] Mapear dependências entre stories"
  - "[ ] Alinhar com ATLAS (viabilidade técnica)"
  - "[ ] Documentar justificativa de priorização"
---

# *prioritize-backlog

INSIGHT prioriza o backlog usando framework de valor × esforço × risco.

## Framework de priorização

```
Score = (User Value × Business Value) / (Effort × Risk)
```

P0 → Score > 8 | P1 → 5-8 | P2 → 2-5 | P3 → < 2
