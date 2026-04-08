import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn().mockReturnValue({
    webhooks: {
      constructEvent: vi.fn(),
    },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  }),
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock('@/services/email.service', () => ({
  emailService: { sendWelcome: vi.fn().mockResolvedValue(undefined) },
}));

import { billingService } from '@/services/billing.service';
import { getStripe } from '@/lib/stripe';
import { emailService } from '@/services/email.service';
import prisma from '@/lib/prisma';

const stripe = getStripe();

beforeEach(() => vi.clearAllMocks());

function makeWebhookEvent(type: string, data: object) {
  return { type, data: { object: data } };
}

describe('billingService.handleWebhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('activates user on subscription.created (active)', async () => {
    const sub = { status: 'active', id: 'sub-1', metadata: { userId: 'user-1', plan: 'CREATOR_STARTER' } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeWebhookEvent('customer.subscription.created', sub) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'PENDING_PAYMENT', email: 'u@e.com', name: 'Diego' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await billingService.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', plan: 'CREATOR_STARTER' }) }),
    );
  });

  it('sends welcome email on first activation (PENDING_PAYMENT → ACTIVE)', async () => {
    const sub = { status: 'active', id: 'sub-1', metadata: { userId: 'user-1', plan: 'CREATOR_PRO' } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeWebhookEvent('customer.subscription.created', sub) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'PENDING_PAYMENT', email: 'u@e.com', name: 'Diego' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await billingService.handleWebhook(Buffer.from('{}'), 'sig');

    expect(emailService.sendWelcome).toHaveBeenCalledWith('u@e.com', 'Diego');
  });

  it('does NOT send welcome email if already active', async () => {
    const sub = { status: 'active', id: 'sub-1', metadata: { userId: 'user-1', plan: 'CREATOR_PRO' } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeWebhookEvent('customer.subscription.updated', sub) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'ACTIVE', email: 'u@e.com', name: 'Diego' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await billingService.handleWebhook(Buffer.from('{}'), 'sig');

    expect(emailService.sendWelcome).not.toHaveBeenCalled();
  });

  it('sets status TRIALING on trial subscription', async () => {
    const sub = { status: 'trialing', id: 'sub-1', metadata: { userId: 'user-1', plan: 'CREATOR_PRO' } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeWebhookEvent('customer.subscription.created', sub) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'PENDING_PAYMENT', email: 'u@e.com', name: 'Diego' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await billingService.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'TRIALING' }) }),
    );
    expect(emailService.sendWelcome).toHaveBeenCalled();
  });

  it('sets status CANCELLED on subscription.deleted', async () => {
    const sub = { id: 'sub-1', metadata: { userId: 'user-1' } };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeWebhookEvent('customer.subscription.deleted', sub) as never);

    await billingService.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    );
  });

  it('sets status PAST_DUE on invoice.payment_failed', async () => {
    const invoice = { customer: 'cus-1' };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeWebhookEvent('invoice.payment_failed', invoice) as never);

    await billingService.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PAST_DUE' } }),
    );
  });

  it('throws 400 on invalid signature', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => { throw new Error('Bad sig'); });

    await expect(
      billingService.handleWebhook(Buffer.from('{}'), 'bad-sig'),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('billingService.createPortalSession', () => {
  it('returns portal URL for user with subscription', async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user-1', stripeCustomerId: 'cus-1',
    } as never);
    const mockStripe = getStripe() as ReturnType<typeof getStripe> & { billingPortal: { sessions: { create: ReturnType<typeof vi.fn> } } };
    mockStripe.billingPortal = { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/portal/xxx' }) } };

    const result = await billingService.createPortalSession('user-1', 'https://app.com/dashboard');
    expect(result.url).toBe('https://billing.stripe.com/portal/xxx');
  });

  it('throws 404 when user has no Stripe customer', async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user-2', stripeCustomerId: null,
    } as never);

    await expect(
      billingService.createPortalSession('user-2', 'https://app.com/dashboard'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('billingService.getPlansWithPrices', () => {
  it('returns all plans with price in reais', async () => {
    const plans = await billingService.getPlansWithPrices();
    expect(plans.length).toBeGreaterThan(0);
    const creator = plans.find((p) => p.id === 'CREATOR_STARTER');
    expect(creator).toBeDefined();
    expect(creator!.price).toBe(49); // 4900 centavos → 49 reais
  });
});

describe('billingService.createCheckoutSession', () => {
  it('creates Stripe checkout session and returns URL', async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user-1', email: 'u@e.com', name: 'Diego', stripeCustomerId: 'cus-1',
    } as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: 'https://checkout.stripe.com/pay/xxx' } as never);
    process.env.STRIPE_PRICE_CREATOR_STARTER = 'price_test_123';

    const result = await billingService.createCheckoutSession(
      'user-1', 'CREATOR_STARTER',
      'https://app.com/success', 'https://app.com/cancel',
    );

    expect(result.url).toBe('https://checkout.stripe.com/pay/xxx');
  });

  it('creates new Stripe customer when stripeCustomerId is null', async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: 'user-2', email: 'new@e.com', name: 'New', stripeCustomerId: null,
    } as never);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus-new' } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: 'https://stripe.com/pay/yyy' } as never);
    process.env.STRIPE_PRICE_CREATOR_STARTER = 'price_test_123';

    const result = await billingService.createCheckoutSession(
      'user-2', 'CREATOR_STARTER',
      'https://app.com/success', 'https://app.com/cancel',
    );

    expect(stripe.customers.create).toHaveBeenCalled();
    expect(result.url).toBe('https://stripe.com/pay/yyy');
  });
});
