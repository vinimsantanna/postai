---
task: Write Unit Tests
responsavel: "@sentinel"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - module: Módulo a ser testado (ex: state-machine, publish-orchestrator)
  - coverage_target: Meta de cobertura (default: 80%)
Saida: |
  - test_suite: Arquivos de teste Jest
  - coverage_report: Relatório de cobertura (Jest coverage)
Checklist:
  - "[ ] Testar happy path de cada função pública"
  - "[ ] Testar edge cases identificados"
  - "[ ] Testar caminhos de erro"
  - "[ ] Mocks para dependências externas"
  - "[ ] Coverage >= 80% em statements, branches, functions"
  - "[ ] Testes rápidos (<100ms cada)"
---

# *write-unit-tests

SENTINEL escreve suite de testes unitários com foco em edge cases e caminhos de erro.

## Test pyramid (unit)

- 70% dos testes são unitários
- Isolados (mocks para DB, Redis, APIs externas)
- Rápidos: suite completa < 30s
- Coverage obrigatório: >80%
