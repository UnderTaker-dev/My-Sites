const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('Donations').select({
      filterByFormula: "{Status} = 'completed'"
    }).all();
    
    const total = records.reduce((sum, record) => {
      return sum + (parseFloat(record.get('Amount')) || 0);
    }, 0);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        total: total,
        count: records.length,
        currency: records.length > 0 ? records[0].get('Currency') : 'USD'
      })
    };
  } catch (error) {
    console.error('Error fetching donations:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch donations' })
    };
  }
};
