
function getStripeClient() {
  const Stripe = require('stripe');
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

const createCheckoutSession = async ({ eventName, ticketName, unitAmount, quantity, successUrl, cancelUrl, metadata }) => {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'pkr',
          product_data: {
            name: `${eventName} — ${ticketName}`
          },
          unit_amount: Math.round(unitAmount * 100)
        },
        quantity
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata
  });

  return session;
};

const getCheckoutSession = async (sessionId) => {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
};

module.exports = { createCheckoutSession, getCheckoutSession };