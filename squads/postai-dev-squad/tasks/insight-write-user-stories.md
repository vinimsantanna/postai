---
task: Write User Stories
responsavel: "@insight"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - epic: Epic de origem
  - persona: Persona do usuário para as stories
Saida: |
  - stories: Lista de user stories no formato Given/When/Then
  - acceptance_criteria: Critérios de aceite testáveis por story
Checklist:
  - "[ ] Formato: 'Como [persona], quero [ação], para [benefício]'"
  - "[ ] Acceptance criteria Given/When/Then"
  - "[ ] Prioridade P0/P1/P2/P3"
  - "[ ] Estimativa de esforço"
  - "[ ] Dependências mapeadas"
  - "[ ] Stories pequenas o suficiente (1 sprint max)"
---

# *write-user-stories

INSIGHT escreve user stories claras e testáveis com acceptance criteria em Given/When/Then.

## Formato

```
Como [persona], quero [ação], para [benefício]

Dado que [contexto]
Quando [ação]
Então [resultado esperado]
```

## Priorização

- P0: Crítico para MVP (sem isso, não lança)
- P1: Alto valor, fazer logo
- P2: Nice to have
- P3: Futuro
