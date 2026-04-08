---
task: Review Code
responsavel: "@atlas"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - pr_url: URL ou descrição do PR a ser revisado
  - context: Contexto da feature (story, requisitos)
Saida: |
  - review_comments: Comentários detalhados com justificativas
  - verdict: approved | changes_requested | blocked
Checklist:
  - "[ ] Entender o contexto da feature"
  - "[ ] Revisar arquitetura e design patterns"
  - "[ ] Checar performance e escalabilidade"
  - "[ ] Verificar segurança (OWASP basics)"
  - "[ ] Avaliar testabilidade"
  - "[ ] Dar feedback construtivo com exemplos"
---

# *review-code

ATLAS faz code review com foco em arquitetura, performance e boas práticas.

## Critérios de avaliação

- Arquitetura: Segue os padrões definidos?
- Performance: Escala para 100k usuários?
- Segurança: Sem vulnerabilidades óbvias?
- Testabilidade: Código é testável e testado?
- Manutenibilidade: Próximo dev vai entender?

## Veredictos

- `approved` → Pode mergear
- `changes_requested` → Ajustes necessários (lista detalhada)
- `blocked` → Problema arquitetural grave, discussão necessária
