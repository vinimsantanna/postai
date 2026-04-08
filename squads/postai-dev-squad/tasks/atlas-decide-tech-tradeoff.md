---
task: Decide Tech Tradeoff
responsavel: "@atlas"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - options: Lista de opções técnicas em consideração
  - context: Contexto do problema, constraints, timeline
Saida: |
  - decision: Decisão final documentada
  - rationale_doc: ADR com trade-offs de cada opção
Checklist:
  - "[ ] Entender o problema a ser resolvido"
  - "[ ] Analisar cada opção (prós e contras)"
  - "[ ] Avaliar fit com stack atual"
  - "[ ] Considerar custo e manutenibilidade"
  - "[ ] Recomendar com justificativa clara"
  - "[ ] Documentar em ADR"
---

# *decide-tech-tradeoff

ATLAS analisa opções técnicas e recomenda com justificativa, sempre apresentando 3 opções com trade-offs.

## Estrutura de análise

Para cada opção: Performance | Custo | Complexidade | Manutenibilidade | Fit com stack

## Output: ADR

```markdown
# ADR-{N}: {Título da decisão}
Status: Accepted
Context: {Problema}
Decision: {Opção escolhida}
Consequences: {O que muda}
Alternatives considered: {Opções rejeitadas e por quê}
```
