---
task: Run Growth Experiment
responsavel: "@catalyst"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - hypothesis: Hipótese a ser testada
  - metric: Métrica primária de sucesso
Saida: |
  - experiment_results: Resultado do experimento (uplift, p-value)
  - learnings: Aprendizados e próximos passos
Checklist:
  - "[ ] Definir hipótese clara (se X, então Y)"
  - "[ ] Definir grupo controle e variante"
  - "[ ] Definir métrica primária e tamanho da amostra"
  - "[ ] Implementar experimento"
  - "[ ] Aguardar significância estatística"
  - "[ ] Analisar resultados"
  - "[ ] Documentar aprendizados"
---

# *run-growth-experiment

CATALYST executa experimentos de crescimento seguindo framework hypothesis-driven.

## Framework

```
Hipótese: Acreditamos que [mudança] para [segmento]
resultará em [resultado] medido por [métrica].
```

## Regras

- Mínimo de 100 usuários por variante
- Duração mínima de 7 dias
- Apenas uma variável por experimento
