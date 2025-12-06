const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if Airtable credentials are configured
  if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
    console.error('Airtable credentials not configured. AIRTABLE_TOKEN:', !!process.env.AIRTABLE_TOKEN, 'AIRTABLE_BASE_ID:', !!process.env.AIRTABLE_BASE_ID);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Newsletter system not configured. Please contact support.'
      })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

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
    
    // Check if already subscribed
    const existing = await base('Subscribers').select({
      filterByFormula: `{Email} = '${email}'`
    }).firstPage();

    if (existing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Already subscribed'
        })
      };
    }

    // Add subscriber to Airtable
    await base('Subscribers').create([
      {
        fields: {
          Email: email
        }
      }
    ]);
    
    console.log('New subscriber added to Airtable:', email);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Subscription successful',
        email: email
      })
    };
  } catch (error) {
    console.error('Subscription error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Subscription failed'
      })
    };
  }
};
