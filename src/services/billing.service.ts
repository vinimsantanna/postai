import type { Plan, UserStatus } from '@prisma/client';
import { getStripe } from '@/lib/stripe';
import { TRIAL_DAYS, TRIAL_PLAN, PLANS } from '@/domain/plans';
import prisma from '@/lib/prisma';

// Maps our Plan enum to Stripe Price IDs (set via env vars after running setup-stripe script)
function getPriceId(plan: Plan): string {
  const envKey = `STRIPE_PRICE_${plan}`;
  const priceId = process.env[envKey];
  if (!priceId) throw new Error(`Stripe Price ID not configured for plan ${plan}. Set ${envKey}`);
  return priceId;
}

export const billingService = {
  async createCheckoutSession(userId: string, plan: Plan, successUrl: string, cancelUrl: string) {
    const stripe = getStripe();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      subscription_data: {
        trial_period_days: plan === TRIAL_PLAN ? TRIAL_DAYS : undefined,
        metadata: { userId, plan },
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      locale: 'pt-BR',
    });

    return { url: session.url! };
  },

  async createPortalSession(userId: string, returnUrl: string) {
    const stripe = getStripe();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.stripeCustomerId) {
      throw Object.assign(new Error('No active subscription'), { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  },

  async handleWebhook(payload: Buffer, signature: string) {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      throw Object.assign(new Error('Invalid webhook signature'), { status: 400 });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await handleSubscriptionUpdate(event.data.object as any);
        break;
      }
      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'CANCELLED' as UserStatus, stripeSubscriptionId: null },
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: 'PAST_DUE' },
        });
        break;
      }
    }

    return { received: true };
  },

  async getPlansWithPrices() {
    return Object.values(PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price / 100, // reais
      description: plan.description,
      features: plan.features,
      maxClients: plan.maxClients,
      trialDays: plan.id === TRIAL_PLAN ? TRIAL_DAYS : null,
    }));
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionUpdate(sub: any) {
  const userId = sub.metadata.userId;
  const planKey = sub.metadata.plan as Plan;

  if (!userId || !planKey) return;

  let status: UserStatus;
  switch (sub.status) {
    case 'trialing': status = 'TRIALING'; break;
    case 'active': status = 'ACTIVE'; break;
    case 'past_due': status = 'PAST_DUE'; break;
    case 'canceled': status = 'CANCELLED'; break;
    default: status = 'PENDING_PAYMENT';
  }

  await prisma.user.update({
    where: { id: userId },
    data: { plan: planKey, status, stripeSubscriptionId: sub.id },
  });
}
