---
task: Design Architecture
responsavel: "@atlas"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - requirements: Requisitos funcionais e não-funcionais
  - constraints: Restrições técnicas, orçamento, timeline
  - scale_target: Escala alvo (ex: 1k→100k usuários)
Saida: |
  - architecture_doc: Documento de arquitetura (15+ páginas)
  - diagrams: Diagramas de componentes, sequência e deploy
  - decisions: ADRs (Architecture Decision Records)
Checklist:
  - "[ ] Entender requisitos e constraints"
  - "[ ] Analisar 3 opções arquiteturais"
  - "[ ] Desenhar componentes e integrações"
  - "[ ] Definir estratégia de escala"
  - "[ ] Documentar ADRs com trade-offs"
  - "[ ] Revisar com CEO/Architect"
---

# *design-architecture

ATLAS desenha a arquitetura do sistema considerando escala, manutenibilidade e custo.

## Processo

1. Coleta de requirements e constraints
2. Análise de 3 opções (sempre apresenta trade-offs)
3. Desenho de componentes e integrações
4. Planejamento de escala (1k→100k)
5. Documentação de decisões (ADRs)
6. Review com CEO/Architect

## Output esperado

- `docs/architecture/system-architecture.md`
- `docs/architecture/adr/` (um arquivo por decisão)
- Diagramas em Mermaid ou draw.io
