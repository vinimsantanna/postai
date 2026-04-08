/**
 * Setup Stripe products and prices for PostAI
 * Run: npx tsx scripts/setup-stripe.ts
 *
 * Outputs the env vars to add to Railway and .env
 */
import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeLib = require('stripe');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' }) as any;

const PLANS = [
  { key: 'CREATOR_STARTER',     name: 'Creator Starter',      price: 4900,  description: 'Para criadores que estão começando' },
  { key: 'CREATOR_PRO',         name: 'Creator Pro',           price: 7900,  description: 'Para criadores em crescimento' },
  { key: 'CREATOR_FULL',        name: 'Creator Full',          price: 10900, description: 'Para criadores profissionais' },
  { key: 'BUSINESS_PLAY',       name: 'Business Play',         price: 10900, description: 'Para negócios em expansão' },
  { key: 'BUSINESS_ENTERPRISE', name: 'Business Enterprise',   price: 16900, description: 'Para empresas' },
  { key: 'AGENCY_SYMPHONY',     name: 'Agency Symphony',       price: 39900, description: 'Para agências — até 10 clientes' },
];

async function main() {
  console.log('🚀 Criando produtos e preços no Stripe...\n');

  const envVars: string[] = [];

  for (const plan of PLANS) {
    // Create product
    const product = await stripe.products.create({
      name: `PostAI ${plan.name}`,
      description: plan.description,
      metadata: { plan_key: plan.key },
    });

    // Create monthly price in BRL
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'brl',
      recurring: { interval: 'month' },
      metadata: { plan_key: plan.key },
    });

    const envLine = `STRIPE_PRICE_${plan.key}=${price.id}`;
    envVars.push(envLine);
    console.log(`✅ ${plan.name} (R$${plan.price / 100}/mês) → ${price.id}`);
  }

  console.log('\n📋 Adicione ao Railway (Variables) e ao seu .env:\n');
  console.log(envVars.join('\n'));
  console.log('\n⚠️  Não commite esses IDs — são apenas configurações do Stripe.');
}

main().catch(console.error);
