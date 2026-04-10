# Landing Page PostAI — Design Spec

**Data:** 2026-04-10  
**Status:** Aprovado  
**Responsável:** @catalyst + @aurora  
**Deploy target:** Vercel (projeto Next.js separado)

---

## 1. Objetivo

Landing page de aquisição de usuários para o PostAI. O objetivo é converter visitantes em signups diretos (trial de 7 dias). Não há lista de espera — o usuário cria conta na hora.

**Meta:** 0 → 100 usuários no mês 1.

---

## 2. Contexto do Produto

PostAI é um SaaS que permite publicar em Instagram, TikTok, LinkedIn e YouTube simultaneamente via WhatsApp bot. Identificação por CPF, sem app separado.

**Deploy do backend:** Railway (`postai-production-a966.up.railway.app`)  
**OAuth:** Instagram funcional; TikTok/LinkedIn/YouTube implementados (a validar)

---

## 3. Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Estilo visual | Clean & Bright | Minimalismo Stripe/Notion, foco em copy e conversão |
| CTA principal | Signup direto | Trial começa na hora, sem fricção de waitlist |
| Cor primária | Verde `#16a34a` | Associação com WhatsApp + crescimento |
| Background | Branco puro `#ffffff` | Leitura clara, profissionalismo |
| Personas | Todas as 3 com seções dedicadas | Diego (creator), Carlos (SMB), Marina (agência) |
| Assets | Placeholders → screenshots reais depois | MVP first |

---

## 4. Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 15 (App Router) |
| Estilo | Tailwind CSS v4 |
| Animações | Framer Motion (scroll reveal suave) |
| Deploy | Vercel (projeto separado do backend) |
| Analytics | GA4 + Meta Pixel |
| Formulário/Auth | Integração com `/api/auth/register` do backend Railway |

---

## 5. Estrutura de Seções

### 5.1 Navbar
- Logo PostAI (ícone verde "P" + wordmark)
- Links: Como funciona | Para quem | Preços | FAQ
- CTA: "Começar grátis →" (fundo preto, sticky no scroll)

### 5.2 Hero
- Badge: "Beta aberto — vagas limitadas" (verde claro, ponto animado)
- H1: "Poste em **5 plataformas** com 1 mensagem no WhatsApp"
- Subtítulo: Instagram, TikTok, LinkedIn e YouTube simultaneamente. Sem app, sem login, sem complicação.
- CTAs: "🚀 Criar conta grátis" (primário verde) + "▷ Ver como funciona" (secundário outline)
- Nota: "Trial 7 dias grátis · Sem cartão de crédito"
- Visual: 3 mock-phones flutuando com conversa WhatsApp simulada mostrando o fluxo de publicação
- Background: gradiente sutil `#f0fdf4 → #fff`

### 5.3 Social Proof Bar
- Métricas: +500 criadores ativos | 5,2s tempo médio | 4 plataformas
- Avatares empilhados com "+200 creators nos primeiros 30 dias"
- Fundo branco, borda sutil

### 5.4 Como Funciona
- Tag: "Como funciona"
- H2: "3 passos para publicar em tudo ao mesmo tempo"
- 3 cards com seta entre eles:
  1. Conecte suas redes (OAuth, 3 minutos)
  2. Manda no WhatsApp (foto/vídeo + legenda)
  3. Publicado em segundos (confirmação no próprio WhatsApp)

### 5.5 Para Quem (3 Personas)
- Layout: 3 cards lado a lado
- Cada card: ícone colorido + nome + papel + quote italic + 3 benefícios com ✓

| Persona | Ícone | Cor | Quote |
|---------|-------|-----|-------|
| Diego (Creator) | 🎬 | Amarelo `#fef3c7` | "Eu não tenho tempo de postar em 4 apps diferentes." |
| Carlos (SMB) | 🏢 | Azul `#dbeafe` | "Precisava contratar social media só pra postar." |
| Marina (Agência) | 📊 | Rosa `#fce7f3` | "Gerencio 12 clientes. Poupei 20h/semana." |

### 5.6 Preços
- 3 planos em grid, Business em destaque (borda verde + badge "Mais popular")
- Todos com CTA "Começar grátis" → trial 7 dias

| Plano | Preço | Destaque |
|-------|-------|----------|
| Creator | R$49/mês | 1 usuário, 4 plataformas |
| Business | R$149/mês | Painel web + 3 usuários **[em destaque]** |
| Agency | R$399/mês | Até 10 clientes |

### 5.7 FAQ
- 4 perguntas com accordion:
  1. Preciso baixar algum app?
  2. Como o bot acessa minhas redes?
  3. Funciona para Reels e vídeos longos?
  4. Posso cancelar quando quiser?

### 5.8 CTA Final
- Fundo preto `#0a0a0a`
- H2: "Pronto para parar de perder **tempo postando**?"
- Subtítulo: "Junte-se a 500+ criadores que já automatizaram sua presença digital."
- Botões: "🚀 Criar conta grátis" + "Ver planos →"
- Nota: "Trial 7 dias · Sem cartão de crédito · Cancele quando quiser"

### 5.9 Footer
- Logo + links (Termos, Privacidade, Suporte) + copyright

---

## 6. Fluxo de Signup

```
Landing page CTA
  → /cadastro (página do projeto Next.js)
  → POST /api/auth/register no Railway
  → Retorna JWT + redireciona para /onboarding
  → Onboarding: conectar redes sociais (OAuth)
  → Primeiro post via WhatsApp
```

A página `/cadastro` já existe no backend (`public/cadastro.html`). A landing page pode linkar para ela inicialmente enquanto a versão Next.js não está pronta.

---

## 7. Performance e SEO

- Core Web Vitals: LCP < 2.5s, CLS < 0.1
- Imagens: next/image com lazy loading
- Fonte: Inter (system fallback) ou Geist
- Meta tags: title, description, OG image
- Schema.org: SoftwareApplication
- Sitemap e robots.txt

---

## 8. Analytics

- GA4: eventos de conversão (signup_started, signup_completed)
- Meta Pixel: para futuros anúncios
- Hotjar (opcional): heatmap para CRO

---

## 9. Critérios de Aceitação

- [ ] Hero acima do fold com CTA visível
- [ ] 3 mock-phones mostrando o fluxo WhatsApp
- [ ] Social proof bar com métricas reais (placeholder ok no MVP)
- [ ] Seção "Para quem" com 3 personas
- [ ] Preços com Business em destaque
- [ ] FAQ com 4 perguntas
- [ ] CTA final em fundo escuro
- [ ] Mobile-first (breakpoints sm/md/lg)
- [ ] Signup direto funcional (redireciona para cadastro)
- [ ] GA4 configurado
- [ ] Deploy na Vercel
- [ ] LCP < 2.5s no Lighthouse
