# Landing Page PostAI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar landing page de aquisição para o PostAI — Next.js 15 separado, deploy na Vercel, design Clean & Bright, com signup direto para trial de 7 dias.

**Architecture:** Projeto Next.js 15 standalone em `~/postai-landing/`, com App Router. Seções são Server Components — apenas `Navbar`, `FAQ` e `SignupButton` usam `'use client'`. CTAs de tracking são extraídos em `SignupButton` (client component pequeno) para não poluir Server Components com event handlers. Analytics carregam após hidratação via componente `Analytics` client-only.

**Tech Stack:** Next.js 15 · Tailwind CSS v4 · Framer Motion · TypeScript · Vercel

---

## File Map

```
~/postai-landing/
├── app/
│   ├── layout.tsx          # Root layout: fonts, metadata + <Analytics /> deferred
│   ├── page.tsx            # Página principal: importa todas as seções em ordem
│   ├── globals.css         # Tailwind base + variáveis de cor
│   └── favicon.ico         # Ícone verde "P" (placeholder)
├── components/
│   ├── Navbar.tsx          # 'use client' — sticky scroll + CTA
│   ├── SignupButton.tsx     # 'use client' — botão com trackSignupClick (reutilizável)
│   ├── Analytics.tsx       # 'use client' — carrega GA4+Pixel após hidratação
│   ├── Hero.tsx            # Server Component — headline + mock-phones + <SignupButton>
│   ├── ProofBar.tsx        # Server Component — métricas + avatares
│   ├── HowItWorks.tsx      # Server Component — 3 passos
│   ├── ForWho.tsx          # Server Component — 3 personas
│   ├── Pricing.tsx         # Server Component — 3 planos + <SignupButton>
│   ├── FAQ.tsx             # 'use client' — accordion de 4 perguntas
│   ├── FinalCTA.tsx        # Server Component — CTA final + <SignupButton>
│   └── Footer.tsx          # Logo + links + copyright
├── lib/
│   └── analytics.ts        # Helpers: trackSignupClick(), trackPageView()
├── public/
│   └── og.png              # OG image placeholder (1200x630)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

**Backend URL:** `https://postai-production-a966.up.railway.app`  
**Signup CTA → URL:** `https://postai-production-a966.up.railway.app/cadastro`

---

## Task 1: Scaffold do projeto

**Files:**
- Create: `~/postai-landing/` (novo projeto)
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Criar projeto Next.js 15 com Tailwind**

```bash
cd ~
npx create-next-app@latest postai-landing \
  --typescript \
  --tailwind \
  --app \
  --src-dir false \
  --import-alias "@/*" \
  --no-eslint
cd postai-landing
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install framer-motion
npm install -D @types/node
```

- [ ] **Step 3: Configurar Tailwind v4 em `app/globals.css`**

Substitua o conteúdo de `app/globals.css` por:

```css
@import "tailwindcss";

:root {
  --green: #16a34a;
  --green-light: #f0fdf4;
  --green-border: #bbf7d0;
  --text-primary: #0a0a0a;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border: #e5e7eb;
  --border-light: #f0f0f0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  background: #fff;
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Configurar `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
```

- [ ] **Step 5: Verificar que o projeto sobe**

```bash
npm run dev
```

Esperado: `http://localhost:3000` abre sem erros.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 + Tailwind v4 + Framer Motion"
```

---

## Task 2: Layout root + metadata SEO

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Escrever `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PostAI — Poste em 5 plataformas com 1 mensagem no WhatsApp',
  description:
    'Publique no Instagram, TikTok, LinkedIn e YouTube simultaneamente via WhatsApp bot. Sem app, sem login. Trial grátis por 7 dias.',
  metadataBase: new URL('https://postai.app'),
  openGraph: {
    title: 'PostAI — Poste em 5 plataformas com 1 mensagem',
    description: 'Automatize sua presença digital via WhatsApp. Trial 7 dias grátis.',
    url: 'https://postai.app',
    siteName: 'PostAI',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'PostAI' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PostAI — Poste em 5 plataformas com 1 mensagem',
    description: 'Automatize sua presença digital via WhatsApp.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PostAI',
              applicationCategory: 'BusinessApplication',
              description:
                'Publique em Instagram, TikTok, LinkedIn e YouTube simultaneamente via WhatsApp bot.',
              offers: {
                '@type': 'Offer',
                price: '49',
                priceCurrency: 'BRL',
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Criar OG image placeholder em `public/og.png`**

Crie um arquivo PNG 1200×630 verde com texto "PostAI" (qualquer editor). Por ora, um arquivo válido qualquer serve — será substituído depois.

```bash
# Alternativa: copiar qualquer PNG existente como placeholder
cp ../postai/public/og.png public/og.png 2>/dev/null || \
  curl -o public/og.png "https://placehold.co/1200x630/16a34a/ffffff?text=PostAI" 2>/dev/null || \
  echo "Crie public/og.png manualmente (1200x630)"
```

- [ ] **Step 3: Verificar metadata no browser**

```bash
npm run dev
```

Abra `http://localhost:3000`. No `<head>` do HTML gerado deve ter `og:title` e `og:image`.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx public/og.png
git commit -m "feat: layout root com metadata SEO e schema.org"
```

---

## Task 3: Navbar

**Files:**
- Create: `components/Navbar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/Navbar.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { trackSignupClick } from '@/lib/analytics'

const SIGNUP_URL = 'https://postai-production-a966.up.railway.app/cadastro'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-black text-sm">
            P
          </div>
          <span className="font-black text-gray-900 text-lg">PostAI</span>
        </a>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-8">
          {['Como funciona', 'Para quem', 'Preços', 'FAQ'].map((label, i) => {
            const hrefs = ['#como-funciona', '#para-quem', '#precos', '#faq']
            return (
              <a
                key={label}
                href={hrefs[i]}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                {label}
              </a>
            )
          })}
        </div>

        {/* CTA */}
        <a
          href={SIGNUP_URL}
          onClick={() => trackSignupClick('navbar')}
          className="bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Começar grátis →
        </a>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Criar `lib/analytics.ts`** (funções puras, sem `'use client'`)

```ts
export function trackSignupClick(location: string) {
  if (typeof window === 'undefined') return

  // GA4
  if (typeof (window as any).gtag === 'function') {
    ;(window as any).gtag('event', 'signup_click', {
      event_category: 'conversion',
      event_label: location,
    })
  }

  // Meta Pixel
  if (typeof (window as any).fbq === 'function') {
    ;(window as any).fbq('track', 'Lead', { location })
  }
}
```

- [ ] **Step 2b: Criar `components/SignupButton.tsx`** (client component reutilizável)

```tsx
'use client'

import { trackSignupClick } from '@/lib/analytics'

const SIGNUP_URL = 'https://postai-production-a966.up.railway.app/cadastro'

interface SignupButtonProps {
  location: string
  variant?: 'primary' | 'secondary' | 'dark'
  children: React.ReactNode
  className?: string
}

export default function SignupButton({
  location,
  variant = 'primary',
  children,
  className = '',
}: SignupButtonProps) {
  const base = 'inline-flex items-center gap-2 font-bold rounded-xl transition-colors'
  const variants = {
    primary: 'bg-green-600 hover:bg-green-700 text-white px-8 py-4 shadow-lg shadow-green-200',
    secondary: 'border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-4',
    dark: 'bg-green-600 hover:bg-green-700 text-white px-8 py-4',
  }

  return (
    <a
      href={SIGNUP_URL}
      onClick={() => trackSignupClick(location)}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  )
}
```

- [ ] **Step 2c: Criar `components/Analytics.tsx`** (carrega scripts após hidratação — `bundle-defer-third-party`)

```tsx
'use client'

import { useEffect } from 'react'

export default function Analytics() {
  useEffect(() => {
    const ga4Id = process.env.NEXT_PUBLIC_GA4_ID
    const fbId = process.env.NEXT_PUBLIC_FB_PIXEL_ID

    // GA4
    if (ga4Id) {
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`
      script.async = true
      document.head.appendChild(script)

      const inline = document.createElement('script')
      inline.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga4Id}');
      `
      document.head.appendChild(inline)
    }

    // Meta Pixel
    if (fbId) {
      const inline = document.createElement('script')
      inline.textContent = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${fbId}');fbq('track','PageView');
      `
      document.head.appendChild(inline)
    }
  }, [])

  return null
}
```

- [ ] **Step 3: Criar `app/page.tsx` inicial com só o Navbar**

```tsx
import Navbar from '@/components/Navbar'

export default function Home() {
  return (
    <main>
      <Navbar />
      <div className="h-screen flex items-center justify-center text-gray-400">
        Em construção...
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Testar no browser**

```bash
npm run dev
```

Abra `http://localhost:3000`. Scroll para baixo — navbar deve ficar branca com sombra. CTA deve linkar para o backend Railway.

- [ ] **Step 5: Commit**

```bash
git add components/Navbar.tsx lib/analytics.ts app/page.tsx
git commit -m "feat: Navbar sticky com scroll effect e CTA"
```

---

## Task 4: Hero section

**Files:**
- Create: `components/Hero.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/Hero.tsx`** (Server Component — sem `'use client'`)

```tsx
import SignupButton from '@/components/SignupButton'

function MockPhone({
  messages,
  className = '',
}: {
  messages: { text: string; out: boolean; tags?: string[] }[]
  className?: string
}) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-xl p-4 w-44 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-[10px] font-semibold text-gray-400">PostAI Bot</span>
      </div>
      <div className="flex flex-col gap-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.out ? 'items-end' : 'items-start'}`}>
            <div
              className={`text-[10px] leading-tight px-2.5 py-1.5 rounded-xl max-w-[90%] ${
                msg.out
                  ? 'bg-green-100 text-green-800 rounded-br-sm'
                  : 'bg-gray-50 border border-gray-100 text-gray-600 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
            {msg.tags && (
              <div className="flex flex-wrap gap-1 mt-1">
                {msg.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative pt-32 pb-0 overflow-hidden bg-gradient-to-b from-green-50 to-white">
      {/* Glow sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-green-100 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Beta aberto — vagas limitadas
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-gray-900 mb-6">
          Poste em{' '}
          <span className="text-green-600">5 plataformas</span>
          <br />
          com 1 mensagem
          <br />
          no WhatsApp
        </h1>

        {/* Subtítulo */}
        <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
          Instagram, TikTok, LinkedIn e YouTube simultaneamente.
          Sem app, sem login, sem complicação.
        </p>

        {/* CTAs — SignupButton é 'use client', pode ser filho de Server Component */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <SignupButton location="hero_primary" variant="primary">
            🚀 Criar conta grátis
          </SignupButton>
          <a
            href="#como-funciona"
            className="border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-base px-6 py-4 rounded-xl transition-colors flex items-center gap-2"
          >
            ▷ Ver como funciona
          </a>
        </div>
        <p className="text-sm text-gray-400">
          Trial <span className="font-semibold text-gray-500">7 dias grátis</span> · Sem cartão de crédito
        </p>

        {/* Mock phones */}
        <div className="relative h-64 md:h-80 mt-16 flex items-end justify-center">
          {/* Phone esquerda */}
          <MockPhone
            messages={[
              { text: 'Olha esse conteúdo 🔥', out: true },
              { text: '✓ Publicado com sucesso!', out: false },
            ]}
            className="absolute left-1/2 -translate-x-[220px] md:-translate-x-[280px] bottom-0 rotate-[-4deg] opacity-75 scale-90"
          />

          {/* Phone central */}
          <MockPhone
            messages={[
              { text: '📸 [minha-foto.jpg]', out: true },
              { text: 'Onde publicar?', out: false, tags: ['Instagram', 'TikTok', 'LinkedIn', 'YouTube'] },
              { text: 'Todas ✅', out: true },
            ]}
            className="absolute bottom-0 z-10 shadow-2xl"
          />

          {/* Phone direita */}
          <MockPhone
            messages={[
              { text: '🎉 Publicado em 4/4!', out: false },
              { text: 'Tempo total: 5,2s', out: false },
            ]}
            className="absolute left-1/2 translate-x-[76px] md:translate-x-[136px] bottom-0 rotate-[4deg] opacity-75 scale-90"
          />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Adicionar Hero ao `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
    </main>
  )
}
```

- [ ] **Step 3: Verificar no browser**

```bash
npm run dev
```

Esperado: hero com headline grande, 3 phones flutuando, badge animado, CTA verde acima do fold em desktop e mobile.

- [ ] **Step 4: Commit**

```bash
git add components/Hero.tsx app/page.tsx
git commit -m "feat: Hero section com headline, CTAs e mock phones WhatsApp"
```

---

## Task 5: Social Proof Bar

**Files:**
- Create: `components/ProofBar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/ProofBar.tsx`**

```tsx
export default function ProofBar() {
  const metrics = [
    { value: '+500', label: 'criadores ativos' },
    { value: '5,2s', label: 'tempo médio de post' },
    { value: '4', label: 'plataformas simultâneas' },
  ]

  const avatarColors = ['bg-amber-400', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500']
  const avatarLabels = ['D', 'C', 'M', '+']

  return (
    <section className="bg-white border-y border-gray-100 py-6">
      <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {metrics.map((m, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="text-2xl font-black text-green-600">{m.value}</span>
            <span className="text-xs text-gray-400 mt-0.5">{m.label}</span>
          </div>
        ))}

        <div className="hidden md:block w-px h-8 bg-gray-100" />

        <div className="flex items-center gap-3">
          <div className="flex">
            {avatarLabels.map((label, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 border-white ${avatarColors[i]} flex items-center justify-center text-white text-xs font-bold ${i > 0 ? '-ml-2' : ''}`}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            <strong className="text-gray-900">200+</strong> creators nos primeiros 30 dias
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Adicionar ao `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProofBar from '@/components/ProofBar'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBar />
    </main>
  )
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
npm run dev
# Verificar: barra com métricas + avatares empilhados logo abaixo do hero
git add components/ProofBar.tsx app/page.tsx
git commit -m "feat: Social Proof Bar com métricas e avatares"
```

---

## Task 6: Como Funciona

**Files:**
- Create: `components/HowItWorks.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/HowItWorks.tsx`**

```tsx
const steps = [
  {
    num: '1',
    title: 'Conecte suas redes',
    desc: 'Autorize Instagram, TikTok, LinkedIn e YouTube uma única vez via OAuth. Leva 3 minutos e é 100% seguro.',
  },
  {
    num: '2',
    title: 'Manda no WhatsApp',
    desc: 'Envie sua foto ou vídeo com a legenda. O bot pergunta onde você quer publicar e confirma antes de postar.',
  },
  {
    num: '3',
    title: 'Publicado em segundos',
    desc: 'Todas as plataformas ao mesmo tempo. Você recebe a confirmação no próprio WhatsApp com o link do post.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <span className="inline-block bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          Como funciona
        </span>
        <h2 className="text-4xl font-black text-gray-900 leading-tight mb-4">
          3 passos para publicar<br />em tudo ao mesmo tempo
        </h2>
        <p className="text-lg text-gray-500 max-w-lg mb-14">
          Zero aprendizado. Se você sabe mandar mensagem no WhatsApp, você sabe usar o PostAI.
        </p>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 h-full">
                <div className="w-10 h-10 bg-green-600 text-white font-black text-sm rounded-xl flex items-center justify-center mb-5">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute top-8 -right-4 z-10 text-gray-300 text-2xl items-center">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Adicionar ao `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProofBar from '@/components/ProofBar'
import HowItWorks from '@/components/HowItWorks'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBar />
      <HowItWorks />
    </main>
  )
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
npm run dev
# Verificar: clicar em "Ver como funciona" no hero deve scrollar para esta seção
git add components/HowItWorks.tsx app/page.tsx
git commit -m "feat: seção Como Funciona com 3 passos"
```

---

## Task 7: Para Quem (Personas)

**Files:**
- Create: `components/ForWho.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/ForWho.tsx`**

```tsx
const personas = [
  {
    icon: '🎬',
    iconBg: 'bg-amber-50',
    name: 'Diego',
    role: 'Creator / Influencer',
    quote: '"Eu não tenho tempo de postar em 4 apps diferentes. Preciso focar no conteúdo."',
    benefits: [
      'Posta em todas as plataformas de uma vez',
      'Zero switching de apps',
      'Histórico de publicações no bot',
    ],
  },
  {
    icon: '🏢',
    iconBg: 'bg-blue-50',
    name: 'Carlos',
    role: 'Dono de negócio',
    quote: '"Precisava contratar social media só pra postar. Agora faço eu mesmo em 2 minutos."',
    benefits: [
      'Sem precisar aprender novas ferramentas',
      'Agendamento de publicações',
      'Relatórios simples de alcance',
    ],
  },
  {
    icon: '📊',
    iconBg: 'bg-pink-50',
    name: 'Marina',
    role: 'Gestora de agência',
    quote: '"Gerencio 12 clientes. O PostAI me poupou 20h por semana de trabalho operacional."',
    benefits: [
      'Gerenciar múltiplos clientes num bot',
      'Publicar por cliente sem trocar de conta',
      'Painel web de controle',
    ],
  },
]

export default function ForWho() {
  return (
    <section id="para-quem" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <span className="inline-block bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          Para quem
        </span>
        <h2 className="text-4xl font-black text-gray-900 leading-tight mb-4">
          Para cada tipo<br />de criador
        </h2>
        <p className="text-lg text-gray-500 mb-12">
          Do influencer solo à agência com dezenas de clientes.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {personas.map((p) => (
            <div key={p.name} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <div className={`w-12 h-12 ${p.iconBg} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                  {p.icon}
                </div>
                <h3 className="text-lg font-black text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{p.role}</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 italic leading-relaxed mb-5 pl-3 border-l-2 border-gray-100">
                  {p.quote}
                </p>
                <ul className="space-y-2">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Adicionar ao `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProofBar from '@/components/ProofBar'
import HowItWorks from '@/components/HowItWorks'
import ForWho from '@/components/ForWho'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBar />
      <HowItWorks />
      <ForWho />
    </main>
  )
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
npm run dev
# Verificar: 3 cards com ícone, nome, quote e benefícios
git add components/ForWho.tsx app/page.tsx
git commit -m "feat: seção Para Quem com 3 personas"
```

---

## Task 8: Preços

**Files:**
- Create: `components/Pricing.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/Pricing.tsx`** (Server Component — usa `<SignupButton>`)

```tsx
import SignupButton from '@/components/SignupButton'

const plans = [
  {
    name: 'Creator',
    price: '49',
    period: '/mês · 1 usuário',
    featured: false,
    features: [
      { text: '4 plataformas', included: true },
      { text: 'Posts ilimitados', included: true },
      { text: 'Agendamento básico', included: true },
      { text: 'Múltiplos clientes', included: false },
      { text: 'Painel web', included: false },
    ],
  },
  {
    name: 'Business',
    price: '149',
    period: '/mês · até 3 usuários',
    featured: true,
    features: [
      { text: '4 plataformas', included: true },
      { text: 'Posts ilimitados', included: true },
      { text: 'Agendamento avançado', included: true },
      { text: 'Painel web', included: true },
      { text: 'Múltiplos clientes', included: false },
    ],
  },
  {
    name: 'Agency',
    price: '399',
    period: '/mês · até 10 clientes',
    featured: false,
    features: [
      { text: '4 plataformas', included: true },
      { text: 'Posts ilimitados', included: true },
      { text: 'Agendamento avançado', included: true },
      { text: 'Painel web completo', included: true },
      { text: 'Até 10 clientes', included: true },
    ],
  },
]

export default function Pricing() {
  return (
    <section id="precos" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <span className="inline-block bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          Preços
        </span>
        <h2 className="text-4xl font-black text-gray-900 mb-4">Simples e sem surpresas</h2>
        <p className="text-lg text-gray-500 mb-14">Comece grátis por 7 dias. Cancele quando quiser.</p>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 ${
                plan.featured
                  ? 'border-2 border-green-600 shadow-xl shadow-green-50'
                  : 'border border-gray-100'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  Mais popular
                </div>
              )}

              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-lg font-bold text-gray-400">R$</span>
                <span className="text-5xl font-black text-gray-900 leading-none">{plan.price}</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">{plan.period}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-gray-200 font-bold">—</span>
                    )}
                    <span className={f.included ? 'text-gray-700' : 'text-gray-300'}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <SignupButton
                location={`pricing_${plan.name.toLowerCase()}`}
                variant={plan.featured ? 'primary' : 'secondary'}
                className="w-full justify-center py-3 text-sm"
              >
                Começar grátis
              </SignupButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Adicionar ao `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProofBar from '@/components/ProofBar'
import HowItWorks from '@/components/HowItWorks'
import ForWho from '@/components/ForWho'
import Pricing from '@/components/Pricing'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBar />
      <HowItWorks />
      <ForWho />
      <Pricing />
    </main>
  )
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
npm run dev
# Verificar: Business tem borda verde e badge "Mais popular", todos os CTAs linkam para Railway
git add components/Pricing.tsx app/page.tsx
git commit -m "feat: seção Preços com 3 planos, Business em destaque"
```

---

## Task 9: FAQ

**Files:**
- Create: `components/FAQ.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/FAQ.tsx`**

```tsx
'use client'

import { useState } from 'react'

const faqs = [
  {
    q: 'Preciso baixar algum app?',
    a: 'Não. O PostAI funciona 100% pelo WhatsApp que você já usa. Nenhum download necessário.',
  },
  {
    q: 'Como o bot acessa minhas redes sociais?',
    a: 'Via OAuth oficial de cada plataforma. Você autoriza uma vez pelo painel web, nunca compartilha senha. Pode revogar o acesso a qualquer momento nas configurações de cada rede.',
  },
  {
    q: 'Funciona para Reels e vídeos longos?',
    a: 'Sim. Fotos, Reels, Stories, vídeos curtos e longos — todos suportados. Cada plataforma recebe o formato correto automaticamente. Vídeos são otimizados para cada rede.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem fidelidade. Cancele em qualquer momento direto no WhatsApp ou no painel web. Você não é cobrado durante o trial de 7 dias.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-6">
        <span className="inline-block bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          FAQ
        </span>
        <h2 className="text-4xl font-black text-gray-900 mb-12">Perguntas frequentes</h2>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-bold text-gray-900 text-sm">{faq.q}</span>
                <span className={`text-gray-400 text-lg transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {open === i ? (
                <div className="px-6 pb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Adicionar ao `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProofBar from '@/components/ProofBar'
import HowItWorks from '@/components/HowItWorks'
import ForWho from '@/components/ForWho'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBar />
      <HowItWorks />
      <ForWho />
      <Pricing />
      <FAQ />
    </main>
  )
}
```

- [ ] **Step 3: Verificar e commitar**

```bash
npm run dev
# Verificar: clicar em cada pergunta abre/fecha o accordion
git add components/FAQ.tsx app/page.tsx
git commit -m "feat: FAQ com accordion interativo"
```

---

## Task 10: CTA Final + Footer

**Files:**
- Create: `components/FinalCTA.tsx`
- Create: `components/Footer.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Criar `components/FinalCTA.tsx`** (Server Component — usa `<SignupButton>`)

```tsx
import SignupButton from '@/components/SignupButton'

export default function FinalCTA() {
  return (
    <section className="bg-gray-900 py-24 text-center">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
          Pronto para parar de<br />
          perder{' '}
          <span className="text-green-400">tempo postando</span>?
        </h2>
        <p className="text-lg text-gray-400 mb-10">
          Junte-se a 500+ criadores que já automatizaram sua presença digital.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <SignupButton location="final_cta" variant="dark">
            🚀 Criar conta grátis
          </SignupButton>
          <a
            href="#precos"
            className="border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 font-semibold text-base px-6 py-4 rounded-xl transition-colors"
          >
            Ver planos →
          </a>
        </div>
        <p className="text-sm text-gray-600 mt-6">
          Trial 7 dias · Sem cartão de crédito · Cancele quando quiser
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Criar `components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-600 rounded-md flex items-center justify-center text-white text-xs font-black">
            P
          </div>
          <span className="font-black text-white text-sm">PostAI</span>
        </div>
        <div className="flex gap-6">
          {['Termos', 'Privacidade', 'Suporte'].map((link) => (
            <a key={link} href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {link}
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-600">© 2026 PostAI. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Finalizar `app/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import ProofBar from '@/components/ProofBar'
import HowItWorks from '@/components/HowItWorks'
import ForWho from '@/components/ForWho'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProofBar />
      <HowItWorks />
      <ForWho />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
```

- [ ] **Step 4: Verificar landing completa**

```bash
npm run dev
```

Scroll da página toda. Verificar:
- Todas as 7 seções visíveis
- CTA final em fundo escuro com verde destacado
- Footer com logo, links e copyright

- [ ] **Step 5: Commit**

```bash
git add components/FinalCTA.tsx components/Footer.tsx app/page.tsx
git commit -m "feat: CTA final e Footer — landing page completa"
```

---

## Task 11: Analytics (GA4 + Meta Pixel)

**Files:**
- Modify: `app/layout.tsx`

**Pré-requisito:** Ter o `NEXT_PUBLIC_GA4_ID` (ex: `G-XXXXXXXXXX`) e o `NEXT_PUBLIC_FB_PIXEL_ID`.

- [ ] **Step 1: Criar `.env.local`**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=XXXXXXXXXXXXXXX
EOF
```

Substitua os valores reais. O arquivo não vai para o git.

- [ ] **Step 2: Adicionar `<Analytics />` ao `app/layout.tsx`**

O componente `Analytics` já foi criado no Task 3. Basta importar e colocar no `<body>` — ele carrega após hidratação (`bundle-defer-third-party`):

```tsx
import Analytics from '@/components/Analytics'

// dentro do <body>:
<body>
  <Analytics />
  {children}
</body>
```

O `layout.tsx` completo fica:

```tsx
import type { Metadata } from 'next'
import Analytics from '@/components/Analytics'
import './globals.css'

export const metadata: Metadata = {
  title: 'PostAI — Poste em 5 plataformas com 1 mensagem no WhatsApp',
  description:
    'Publique no Instagram, TikTok, LinkedIn e YouTube simultaneamente via WhatsApp bot. Sem app, sem login. Trial grátis por 7 dias.',
  metadataBase: new URL('https://postai.app'),
  openGraph: {
    title: 'PostAI — Poste em 5 plataformas com 1 mensagem',
    description: 'Automatize sua presença digital via WhatsApp. Trial 7 dias grátis.',
    url: 'https://postai.app',
    siteName: 'PostAI',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'PostAI' }],
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PostAI',
              applicationCategory: 'BusinessApplication',
              description:
                'Publique em Instagram, TikTok, LinkedIn e YouTube simultaneamente via WhatsApp bot.',
              offers: { '@type': 'Offer', price: '49', priceCurrency: 'BRL' },
            }),
          }}
        />
      </head>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verificar no browser (com GA4 ID real)**

```bash
npm run dev
```

Abrir DevTools → Network → filtrar por `gtag` ou `fbevents`. Scripts devem carregar.

- [ ] **Step 4: Criar `.env.local` no `.gitignore` (confirmar)**

```bash
grep -q '.env.local' .gitignore || echo '.env.local' >> .gitignore
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx .gitignore
git commit -m "feat: GA4 e Meta Pixel via env vars"
```

---

## Task 12: Mobile responsiveness + build de produção

**Files:**
- Review: todos os componentes (verificar classes `md:` e `sm:`)

- [ ] **Step 1: Testar mobile no browser**

```bash
npm run dev
```

DevTools → toggle device toolbar → iPhone 14 (390px). Verificar:
- Hero: headline cabe sem overflow
- Phones: central visível, laterais escondidas ou sobrepostas ok
- ProofBar: wrap correto em 2 linhas
- Steps: empilhados verticalmente
- Personas: empilhadas verticalmente
- Pricing: empilhado verticalmente, Business com badge visível
- FAQ: funciona no toque

- [ ] **Step 2: Build de produção**

```bash
npm run build
```

Esperado: `✓ Compiled successfully`. Zero erros de TypeScript ou Tailwind.

- [ ] **Step 3: Testar build local**

```bash
npm start
```

Abrir `http://localhost:3000`. Verificar que tudo funciona idêntico ao dev.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: ajustes de responsividade mobile"
```

---

## Task 13: Deploy na Vercel

**Files:**
- Create: `vercel.json` (opcional, apenas se precisar de redirects)

- [ ] **Step 1: Criar repositório no GitHub**

```bash
# No GitHub, criar repo público ou privado: postai-landing
gh repo create postai-landing --private --source=. --remote=origin --push
```

Ou via `gh` CLI se disponível:
```bash
git remote add origin https://github.com/SEU_USER/postai-landing.git
git push -u origin main
```

- [ ] **Step 2: Conectar na Vercel**

1. Acesse [vercel.com](https://vercel.com) → New Project
2. Importe o repo `postai-landing`
3. Framework: Next.js (auto-detectado)
4. Build command: `npm run build` (padrão)
5. Output: `.next` (padrão)
6. Adicione as env vars:
   - `NEXT_PUBLIC_GA4_ID` = seu ID
   - `NEXT_PUBLIC_FB_PIXEL_ID` = seu ID

- [ ] **Step 3: Deploy e verificar URL**

Após deploy, a Vercel fornece uma URL `postai-landing-xxx.vercel.app`.

Verificar:
- Landing carrega sem erros
- Links de CTA apontam para Railway (`postai-production-a966.up.railway.app/cadastro`)
- Analytics scripts carregam

- [ ] **Step 4: Configurar domínio (opcional)**

Na Vercel → Settings → Domains → adicionar `postai.app` ou similar.

- [ ] **Step 5: Verificar Lighthouse**

No Chrome DevTools → Lighthouse → modo Desktop e Mobile.

Targets:
- Performance: ≥ 90
- LCP: < 2,5s
- CLS: < 0,1

---

## Self-Review

**Cobertura da spec:**

| Requisito | Task |
|-----------|------|
| Hero com CTA acima do fold | Task 4 |
| 3 mock-phones WhatsApp | Task 4 (MockPhone) |
| Social proof bar | Task 5 |
| Como funciona (3 passos) | Task 6 |
| Para quem (3 personas) | Task 7 |
| Preços com Business em destaque | Task 8 |
| FAQ com 4 perguntas | Task 9 |
| CTA final fundo escuro | Task 10 |
| Footer | Task 10 |
| Mobile-first | Task 12 |
| GA4 + Meta Pixel | Task 11 |
| Deploy Vercel | Task 13 |
| Signup direto → Railway | Tasks 3, 4, 8, 10 (SIGNUP_URL) |
| SEO + OG + Schema.org | Task 2 |

**Verificação de consistência:**
- `SIGNUP_URL` definida em Navbar, Hero, Pricing, FinalCTA — sempre a mesma constante
- `trackSignupClick()` exportado de `lib/analytics.ts` e importado em Navbar, Hero, Pricing, FinalCTA — assinatura consistente `(location: string) => void`
- IDs de seção (`#como-funciona`, `#para-quem`, `#precos`, `#faq`) definidos nos componentes e referenciados no Navbar — consistentes
