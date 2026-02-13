const Airtable = require('airtable');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, reason } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid email address'
        })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Remove from Subscribers
    const subscriberRecords = await base('Subscribers').select({
      filterByFormula: `{Email} = '${email}'`
    }).firstPage();
    
    if (subscriberRecords.length > 0) {
      await base('Subscribers').destroy(subscriberRecords.map(r => r.id));
    }

    // Get subscription date before removing
    let subscribedDate = null;
    if (subscriberRecords.length > 0) {
      subscribedDate = subscriberRecords[0].get('Subscribed Date');
    }
    
    // Add to Unsubscribed
    await base('Unsubscribed').create([
      {
        fields: {
          Email: email,
          'Unsubscribed Date': new Date().toISOString().split('T')[0],
          'Previously Subscribed Date': subscribedDate,
          Reason: reason || 'Not specified',
          'IP Address': event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'Unknown'
        }
      }
    ]);
    
    console.log('Unsubscribe request:', {
      email: email,
      timestamp: new Date().toISOString(),
      userAgent: event.headers['user-agent']
    });

    // Send Discord notification (non-blocking)
    try {
      const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
      await fetch(`${baseUrl}/.netlify/functions/send-discord-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'unsubscribed',
          data: {
            email,
            reason: reason || 'Not specified',
            ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'Unknown'
          }
        })
      });
    } catch (notifyError) {
      console.error('Failed to send unsubscribe notification:', notifyError);
    }

    // Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Successfully unsubscribed',
        email: email
      })
    };
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Unsubscribe failed'
      })
    };
  }
};
