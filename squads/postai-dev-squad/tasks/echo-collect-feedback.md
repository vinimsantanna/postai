---
task: Collect Feedback
responsavel: "@echo"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - feedback_type: survey | interview | usage_data | support_tickets
  - users: Segmento de usuários
Saida: |
  - feedback_synthesis: Síntese dos insights coletados
  - product_insights: Recomendações para INSIGHT
Checklist:
  - "[ ] Definir perguntas de pesquisa"
  - "[ ] Coletar feedback (survey/entrevista)"
  - "[ ] Analisar padrões e recorrências"
  - "[ ] Priorizar insights por frequência e impacto"
  - "[ ] Criar síntese estruturada"
  - "[ ] Enviar para INSIGHT com recomendações"
---

# *collect-feedback

ECHO coleta e sintetiza feedback dos usuários para alimentar o ciclo produto → design → dev.

## Cadência

- Semana 1: Feedback de onboarding (entrevista 1:1)
- Semana 2-4: Survey semanal (NPS + 2 perguntas abertas)
- Mensal: Entrevistas aprofundadas (3-5 usuários)
