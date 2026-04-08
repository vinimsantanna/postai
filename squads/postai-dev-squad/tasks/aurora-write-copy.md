---
task: Write Copy
responsavel: "@aurora"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - context: Contexto do conteúdo (onboarding, error, success, etc.)
  - tone: Tom desejado (friendly, professional, empowering)
Saida: |
  - copy_variants: Variantes de copy por contexto
  - ab_options: Opções para A/B testing
Checklist:
  - "[ ] Copy para todas as mensagens do bot"
  - "[ ] Mensagens de erro (empáticas, com próximo passo)"
  - "[ ] Mensagens de sucesso (celebratórias mas concisas)"
  - "[ ] Onboarding (welcome sequence)"
  - "[ ] Microcopy de botões e opções"
  - "[ ] Revisar com INSIGHT (alinhado com produto)"
---

# *write-copy

AURORA escreve todo o copy do bot e das comunicações do PostAI.

## Princípios

- Ativo, não passivo
- Uma ideia por mensagem
- Friendly mas profissional
- Emojis com propósito, nunca decoração
- Errors sempre com próximo passo claro
