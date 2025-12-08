const Airtable = require('airtable');
const Stripe = require('stripe');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = event.headers['stripe-signature'];
    
    // Verify webhook signature (optional but recommended for production)
    // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    
    // For now, parse the event directly
    const stripeEvent = JSON.parse(event.body);

    // Handle checkout.session.completed event
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      
      console.log('Checkout session completed:', session.id);
      
      const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
      
      await base('Donations').create([
        {
          fields: {
            Amount: session.amount_total / 100, // Convert from cents
            Currency: session.currency.toUpperCase(),
            Email: session.customer_details?.email || 'Anonymous',
            'Stripe Session ID': session.id,
            Status: 'completed',
            Timestamp: new Date().toISOString()
          }
        }
      ]);
      
      console.log('Donation saved to Airtable');
      
      // Send admin notification (non-blocking)
      try {
        await fetch(`https://mathi4s.com/.netlify/functions/notify-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_donation',
            data: {
              amount: (session.amount_total / 100).toFixed(2),
              currency: session.currency.toUpperCase(),
              email: session.customer_details?.email || 'Anonymous'
            }
          })
        });
      } catch (notifyError) {
        console.error('Failed to send admin notification:', notifyError);
      }
      
      // Send thank you email if email provided and Microsoft Graph configured
      const donorEmail = session.customer_details?.email;
      if (donorEmail && process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID) {
        try {
          // Get Microsoft Graph access token
          const tokenResponse = await fetch(
            `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                scope: 'https://graph.microsoft.com/.default',
                grant_type: 'client_credentials'
              })
            }
          );

          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token) {
            const amount = (session.amount_total / 100).toFixed(2);
            const currency = session.currency.toUpperCase();
            
            // Send thank you email
            await fetch(
              `https://graph.microsoft.com/v1.0/users/${process.env.SENDER_EMAIL || 'support@mathi4s.com'}/sendMail`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: {
                    subject: '💚 Thank You for Your Support!',
                    body: {
                      contentType: 'HTML',
                      content: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                          <h1 style="font-size: 2rem; margin-bottom: 1rem;">🎉 Thank You!</h1>
                          <p style="font-size: 1.1rem; margin-bottom: 1rem;">Your generous donation of <strong>${currency} ${amount}</strong> means the world to me!</p>
                          <p style="margin-bottom: 1rem;">Your support helps me continue creating cool projects and coding adventures. 🚀</p>
                          <p style="margin-bottom: 1rem;">Every Monster energy drink (or two) is well appreciated! 😄</p>
                          <hr style="border: none; border-top: 2px solid rgba(255,255,255,0.3); margin: 2rem 0;">
                          <p style="font-size: 0.9rem; opacity: 0.8;">
                            Visit my website: <a href="https://mathi4s.com" style="color: #fff; text-decoration: underline;">mathi4s.com</a>
                          </p>
                          <p style="font-size: 0.85rem; opacity: 0.7; margin-top: 1rem;">
                            Transaction ID: ${session.id}
                          </p>
                        </div>
                      `
                    },
                    toRecipients: [
                      {
                        emailAddress: {
                          address: donorEmail
                        }
                      }
                    ]
                  },
                  saveToSentItems: true
                })
              }
            );
            
            console.log('Thank you email sent to:', donorEmail);
          }
        } catch (emailError) {
          console.error('Failed to send thank you email:', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
