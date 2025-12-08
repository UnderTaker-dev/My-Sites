const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('Donations').select({
      sort: [{ field: 'Timestamp', direction: 'desc' }]
    }).all();
    
    const donations = records.map(record => ({
      amount: parseFloat(record.get('Amount')) || 0,
      email: record.get('Email') || 'Anonymous',
      timestamp: record.get('Timestamp'),
      status: record.get('Status') || 'pending'
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ donations: donations })
    };
  } catch (error) {
    console.error('Error fetching donations details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch donations details', donations: [] })
    };
  }
};
