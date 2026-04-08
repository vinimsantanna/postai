---
task: Create Design System
responsavel: "@aurora"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - brand_guidelines: Cores, tipografia, tom de voz do PostAI
Saida: |
  - component_library: Componentes documentados (se houver dashboard)
  - tokens: Design tokens (cores, espaçamentos, tipografia)
  - figma_file: Link para o arquivo Figma
Checklist:
  - "[ ] Definir paleta de cores + tokens"
  - "[ ] Definir tipografia"
  - "[ ] Padrões de mensagem do bot (success, error, info)"
  - "[ ] Ícones e emojis padronizados"
  - "[ ] Componentes de dashboard (se aplicável)"
  - "[ ] Documentar uso de cada componente"
---

# *create-design-system

AURORA cria o design system do PostAI com foco em consistência visual e conversacional.

## Escopo

Foco principal: padrões de mensagem do bot.
Dashboard (se existir): componentes React com Radix UI.
