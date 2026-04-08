---
task: Ensure LGPD Compliance
responsavel: "@harmony"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - data_flows: Mapeamento de todos os dados coletados e processados
Saida: |
  - compliance_doc: Documento de compliance LGPD
  - consent_flows: Fluxos de coleta de consentimento
  - deletion_procedures: Procedimentos de exclusão de dados
Checklist:
  - "[ ] Mapear dados coletados (tipos, finalidades)"
  - "[ ] Privacy Policy (linguagem clara)"
  - "[ ] Terms of Service"
  - "[ ] Consent flow no onboarding"
  - "[ ] Opt-in explícito para marketing"
  - "[ ] Procedimento de exclusão (direito ao esquecimento)"
  - "[ ] Notificação de breach (<72h)"
  - "[ ] DPA com vendors (Evolution API, AWS)"
---

# *ensure-lgpd-compliance

HARMONY garante conformidade total com LGPD para o PostAI.

## Dados coletados

- Dados de conta (nome, email, telefone WhatsApp)
- Credenciais de plataformas sociais (OAuth tokens — criptografados)
- Conteúdo de posts (deletado após publicação)
- Logs de uso (anonimizados após 90 dias)
