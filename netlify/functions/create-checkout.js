exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Check if Stripe key is configured
  console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
  console.log('STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length);
  console.log('STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 10));
  
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.trim() === '') {
    console.error('STRIPE_SECRET_KEY is not configured properly');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment system not configured. Please contact support.' })
    };
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    const { amount } = JSON.parse(event.body);
    
    // Validate amount (minimum $1, maximum $10000)
    if (!amount || amount < 1 || amount > 10000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Amount must be between $1 and $10,000' })
      };
    }

    // Create Checkout Session
    const session = await stripe.checkout.Session.create({
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
      success_url: `${event.headers.origin || 'https://mathi4s.com'}/success.html?amount=${amount}`,
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
