import type { Plan } from '@prisma/client';

export const TRIAL_DAYS = 7;

export interface PlanConfig {
  id: Plan;
  name: string;
  price: number;       // em centavos BRL
  description: string;
  features: string[];
  maxClients: number;  // 0 = não é agência
  maxPostsPerMonth: number; // -1 = ilimitado
}

export const PLANS: Record<Plan, PlanConfig> = {
  CREATOR_STARTER: {
    id: 'CREATOR_STARTER',
    name: 'Creator Starter',
    price: 4900,
    description: 'Para criadores que estão começando',
    features: [
      '30 posts/mês',
      '4 plataformas simultâneas',
      'Agendamento de posts',
      'Notificações WhatsApp com links',
    ],
    maxClients: 0,
    maxPostsPerMonth: 30,
  },
  CREATOR_PRO: {
    id: 'CREATOR_PRO',
    name: 'Creator Pro',
    price: 7900,
    description: 'Para criadores em crescimento',
    features: [
      '100 posts/mês',
      '4 plataformas simultâneas',
      'Agendamento de posts',
      'Histórico 90 dias',
      'Retry automático de falhas',
    ],
    maxClients: 0,
    maxPostsPerMonth: 100,
  },
  CREATOR_FULL: {
    id: 'CREATOR_FULL',
    name: 'Creator Full',
    price: 10900,
    description: 'Para criadores profissionais',
    features: [
      'Posts ilimitados',
      '4 plataformas simultâneas',
      'Agendamento ilimitado',
      'Histórico completo',
      'Analytics de publicações',
    ],
    maxClients: 0,
    maxPostsPerMonth: -1,
  },
  BUSINESS_PLAY: {
    id: 'BUSINESS_PLAY',
    name: 'Business Play',
    price: 10900,
    description: 'Para negócios em expansão',
    features: [
      'Posts ilimitados',
      '4 plataformas simultâneas',
      'Até 3 usuários',
      'Relatórios mensais',
      'Suporte por email',
    ],
    maxClients: 0,
    maxPostsPerMonth: -1,
  },
  BUSINESS_ENTERPRISE: {
    id: 'BUSINESS_ENTERPRISE',
    name: 'Business Enterprise',
    price: 16900,
    description: 'Para empresas que precisam de mais',
    features: [
      'Posts ilimitados',
      '4 plataformas simultâneas',
      'Usuários ilimitados',
      'Suporte prioritário',
      'SLA 99.9%',
      'Onboarding dedicado',
    ],
    maxClients: 0,
    maxPostsPerMonth: -1,
  },
  AGENCY_SYMPHONY: {
    id: 'AGENCY_SYMPHONY',
    name: 'Agency Symphony',
    price: 39900,
    description: 'Para agências de social media',
    features: [
      'Posts ilimitados',
      '4 plataformas por cliente',
      'Até 10 clientes',
      'Dashboard por cliente',
      'Relatórios individuais',
      'Suporte prioritário',
    ],
    maxClients: 10,
    maxPostsPerMonth: -1,
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS[plan];
}

export function canAddClient(plan: Plan, currentClients: number): boolean {
  const config = PLANS[plan];
  if (config.maxClients === 0) return false;
  return currentClients < config.maxClients;
}
