// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeLib = require('stripe');

export type StripeInstance = InstanceType<typeof StripeLib>;

let _stripe: StripeInstance | null = null;

export function getStripe(): StripeInstance {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = new StripeLib(key, { apiVersion: '2026-03-25.dahlia' });
  }
  return _stripe;
}
