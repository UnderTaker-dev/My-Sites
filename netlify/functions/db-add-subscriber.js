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
    
    // Check if already subscribed
    const existing = await base('Subscribers').select({
      filterByFormula: `{Email} = '${email}'`
    }).firstPage();

    if (existing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Already subscribed' })
      };
    }

    // Add subscriber
    await base('Subscribers').create([
      {
        fields: {
          Email: email
        }
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscribed successfully' })
    };
  } catch (error) {
    console.error('Error adding subscriber:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add subscriber' })
    };
  }
};
