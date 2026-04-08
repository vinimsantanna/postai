---
task: Build n8n Workflow
responsavel: "@velocity"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - platforms: Plataformas alvo (instagram, tiktok, linkedin, youtube)
  - triggers: Eventos que disparam o workflow
Saida: |
  - n8n_workflow_json: Workflow exportado em JSON
  - webhook_config: Configuração do webhook trigger
Checklist:
  - "[ ] Webhook trigger para iniciar publicação"
  - "[ ] Split para publicação paralela por plataforma"
  - "[ ] Error handling por plataforma"
  - "[ ] Aggregação de resultados"
  - "[ ] Notificação de sucesso/falha via WhatsApp"
  - "[ ] Logging de cada etapa"
  - "[ ] Testar com dados reais"
---

# *build-n8n-workflow

VELOCITY cria workflow n8n que orquestra publicação paralela em 4 plataformas.

## Arquitetura do workflow

```
Webhook trigger →
  Split(4 paralelo):
    Instagram publish
    TikTok publish
    LinkedIn publish
    YouTube publish
  Aggregate results →
  Send WhatsApp notification
```
