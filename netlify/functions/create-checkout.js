const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Check if Stripe key is configured
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.trim() === '') {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment system not configured. Please contact support.' })
    };
  }

  let stripe;
  try {
    const Stripe = require('stripe');
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to initialize payment system: ' + err.message })
    };
  }

  try {
    const { amount } = JSON.parse(event.body);
    
    // Validate amount (minimum $1, maximum $10000)
    if (!amount || amount < 1 || amount > 10000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Amount must be between $1 and $10,000' })
      };
    }

    // Server-side rate limit + VPN soft check
    try {
      const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
      const rateResponse = await fetch(`${baseUrl}/.netlify/functions/check-rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'donation' })
      });

      const rateData = await rateResponse.json();
      if (!rateData.allowed) {
        return {
          statusCode: rateData.blocked ? 403 : 429,
          body: JSON.stringify({
            error: rateData.reason || 'Too many requests. Please try again later.',
            blocked: rateData.blocked || false,
            appealUrl: rateData.appealUrl
          })
        };
      }
    } catch (rateError) {
      // Fail open if rate limit check fails
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Buy Mathias a Monster',
            description: 'Thanks for the energy boost!',
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      success_url: `${event.headers.origin || 'https://mathi4s.com'}/thank-you.html`,
      cancel_url: `${event.headers.origin || 'https://mathi4s.com'}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
