---
task: Mentor Dev
responsavel: "@atlas"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - dev_agent: Agente a ser mentorado (cipher | velocity)
  - topic: Tópico da sessão (ex: state machine design, API integration patterns)
Saida: |
  - guidance: Orientações e recomendações
  - questions: Perguntas socráticas para guiar o aprendizado
  - learning_points: Pontos-chave documentados
Checklist:
  - "[ ] Entender o contexto e dificuldade do dev"
  - "[ ] Fazer perguntas antes de dar respostas"
  - "[ ] Explicar o porquê, não só o como"
  - "[ ] Fornecer exemplos concretos"
  - "[ ] Documentar pontos de aprendizado"
---

# *mentor-dev

ATLAS usa método socrático para guiar CIPHER e VELOCITY, construindo autonomia em vez de dependência.

## Método

1. Ouve o problema sem interromper
2. Faz perguntas para revelar a solução
3. Explica princípio por trás da solução
4. Fornece exemplo prático
5. Documenta para referência futura
