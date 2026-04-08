---
task: Design Conversation Flow
responsavel: "@aurora"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - user_journey: Jornada do usuário (de INSIGHT)
  - platforms: Plataformas suportadas
Saida: |
  - flow_diagrams: Diagramas de todos os estados conversacionais
  - message_patterns: Padrões de mensagem por contexto
Checklist:
  - "[ ] Mapear happy path (WhatsApp → 4 plataformas)"
  - "[ ] Mapear estados de erro e recuperação"
  - "[ ] Definir mensagens de cada estado"
  - "[ ] Definir botões e opções rápidas"
  - "[ ] Garantir first post em <3 minutos"
  - "[ ] Testar fluxo com usuário real"
---

# *design-conversation-flow

AURORA projeta a experiência conversacional do bot WhatsApp do PostAI.

## Princípios

- Uma informação por mensagem
- Progresso sempre visível
- Errors são oportunidade, não obstáculo
- Zero jargão técnico

## Fluxo principal

```
Boas-vindas → Solicita conteúdo → Confirma plataformas →
Preview → Confirma publicação → Publicando... → Resultado
```
