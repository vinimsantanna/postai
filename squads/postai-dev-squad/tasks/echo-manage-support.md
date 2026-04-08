---
task: Manage Support
responsavel: "@echo"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - issue: Descrição do problema do usuário
  - priority: urgent | high | normal | low
Saida: |
  - resolution: Solução aplicada
  - internal_ticket: Ticket interno (se escalado)
  - knowledge_entry: Entrada na base de conhecimento
Checklist:
  - "[ ] Responder em < 2 horas (urgent < 30 min)"
  - "[ ] Confirmar entendimento do problema"
  - "[ ] Resolver ou escalar corretamente"
  - "[ ] Comunicar resolução ao usuário"
  - "[ ] Documentar na base de conhecimento"
  - "[ ] Reportar bugs para SENTINEL"
---

# *manage-support

ECHO oferece suporte proativo e resolutivo para os usuários do PostAI.

## SLAs

- Urgent (sistema fora do ar): < 30 min
- High (não consegue publicar): < 2 horas
- Normal (dúvidas, erros não críticos): < 4 horas
- Low (sugestões, feedback): < 24 horas
