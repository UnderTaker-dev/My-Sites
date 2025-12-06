const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('Unsubscribed').select().all();
    const unsubscribed = records.map(record => ({
      id: record.id,
      email: record.get('Email'),
      date: record.get('Date')
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(unsubscribed)
    };
  } catch (error) {
    console.error('Error fetching unsubscribed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch unsubscribed' })
    };
  }
};
