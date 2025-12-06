const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('Subscribers').select().all();
    const subscribers = records.map(record => ({
      id: record.id,
      email: record.get('Email')
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(subscribers)
    };
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch subscribers' })
    };
  }
};
