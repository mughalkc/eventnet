const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a payment intent for ticket purchase
 * @param {Number} amount - Amount in cents
 * @param {String} currency - Currency code (default: usd)
 * @param {Object} metadata - Additional metadata for the payment
 * @returns {Promise<Object>} Stripe payment intent
 */
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirm payment intent status
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Payment intent object
 */
const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw error;
  }
};

/**
 * Create a refund for a payment
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @param {Number} amount - Amount to refund in cents (optional)
 * @returns {Promise<Object>} Refund object
 */
const createRefund = async (paymentIntentId, amount = null) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId,
    };
    
    if (amount) {
      refundParams.amount = amount;
    }
    
    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  createRefund,
};
