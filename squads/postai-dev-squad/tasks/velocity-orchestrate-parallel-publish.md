---
task: Orchestrate Parallel Publish
responsavel: "@velocity"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - content: Conteúdo a ser publicado (texto, mídia, metadata)
  - platforms: Lista de plataformas selecionadas pelo usuário
Saida: |
  - publish_results: Resultado por plataforma (success | error | skipped)
  - error_report: Detalhes de falhas por plataforma
Checklist:
  - "[ ] Promise.allSettled para paralelismo"
  - "[ ] Timeout por plataforma (10s)"
  - "[ ] Graceful degradation (1 falha não para as outras)"
  - "[ ] Resultado consolidado para o usuário"
  - "[ ] Log detalhado por plataforma"
  - "[ ] Retry automático para falhas transientes"
---

# *orchestrate-parallel-publish

VELOCITY implementa orquestração de publicação paralela com graceful degradation.

## Target

- 4 plataformas em <5 segundos
- Se 1 plataforma falhar, as 3 outras continuam
- Usuário recebe status de cada plataforma via WhatsApp
