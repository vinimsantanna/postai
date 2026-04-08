---
task: Report Bugs
responsavel: "@sentinel"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - issue_description: Descrição do problema observado
  - logs: Logs relevantes, stack traces, screenshots
Saida: |
  - bug_report: Relatório estruturado com passos de reprodução
  - reproduction_steps: Passos mínimos para reproduzir
  - priority: CRITICAL | HIGH | MEDIUM | LOW
Checklist:
  - "[ ] Confirmar que o bug é reproduzível"
  - "[ ] Isolar passos mínimos de reprodução"
  - "[ ] Documentar expected vs actual"
  - "[ ] Classificar severidade e impacto"
  - "[ ] Incluir logs e contexto relevante"
  - "[ ] Atribuir ao agente correto"
---

# *report-bugs

SENTINEL documenta bugs de forma estruturada para facilitar correção.

## Template de bug report

```markdown
**Título:** [PRIORITY] Descrição curta
**Severidade:** CRITICAL | HIGH | MEDIUM | LOW
**Reproduzível:** Sempre | Intermitente | Uma vez
**Passos:**
1. ...
2. ...
**Esperado:** ...
**Atual:** ...
**Logs:** (stack trace)
**Ambiente:** staging | production
```
