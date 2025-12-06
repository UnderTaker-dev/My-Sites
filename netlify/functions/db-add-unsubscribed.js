const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email' })
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

    // Add to Unsubscribed
    await base('Unsubscribed').create([
      {
        fields: {
          Email: email,
          Date: new Date().toISOString().split('T')[0]
        }
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Unsubscribed successfully' })
    };
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to unsubscribe' })
    };
  }
};
