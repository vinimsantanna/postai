---
task: Track NPS
responsavel: "@echo"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - survey_cohort: Segmento de usuários a pesquisar
Saida: |
  - nps_score: Score NPS (Promoters - Detractors)
  - verbatim_analysis: Análise qualitativa dos comentários
  - action_items: Ações sugeridas para melhorar NPS
Checklist:
  - "[ ] Enviar pesquisa NPS (0-10 + campo aberto)"
  - "[ ] Calcular NPS = %Promoters - %Detractors"
  - "[ ] Analisar verbatim por tema"
  - "[ ] Identificar top 3 razões de detração"
  - "[ ] Identificar top 3 razões de promoção"
  - "[ ] Criar action items priorizados"
  - "[ ] Compartilhar com squad"
---

# *track-nps

ECHO mede e analisa NPS mensalmente para guiar melhorias do produto.

## Meta NPS

- Beta (primeiros 10 users): > 50
- Mês 1: > 40
- Mês 3: > 60

## Segmentação

- Promotores (9-10): entender o que amam → amplificar
- Passivos (7-8): entender o que falta → converter
- Detratores (0-6): resolver urgente → recuperar
