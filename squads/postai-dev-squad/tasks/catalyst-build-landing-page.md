---
task: Build Landing Page
responsavel: "@catalyst"
responsavel_type: agent
atomic_layer: task
elicit: false
Entrada: |
  - value_prop: Proposta de valor principal
  - cta: Call-to-action principal (ex: "Entrar na lista de espera")
Saida: |
  - landing_page: Landing page live (Vercel ou similar)
  - copy: Todos os textos da página
  - analytics_config: Setup de GA4 e pixels
Checklist:
  - "[ ] Hero com proposta de valor clara"
  - "[ ] Demo/video do produto"
  - "[ ] Social proof (early users, testimonials)"
  - "[ ] CTA acima do fold"
  - "[ ] FAQ"
  - "[ ] Mobile-first"
  - "[ ] Core Web Vitals (LCP < 2.5s)"
  - "[ ] GA4 + pixel configurados"
---

# *build-landing-page

CATALYST cria landing page otimizada para conversão de leads/signups do PostAI.

## Estrutura

Hero → Demo → Features → Social Proof → Pricing → FAQ → CTA final
