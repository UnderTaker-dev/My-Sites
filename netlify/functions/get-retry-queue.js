const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    let items = [];
    try {
      items = await base('EmailQueue').select({
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        filterByFormula: `{Status} = 'Failed'`,
        maxRecords: 50
      }).all();
    } catch (err) {
      console.error('EmailQueue read failed:', err.message);
    }

    const queue = items.map(r => ({
      id: r.id,
      email: r.fields.Email,
      token: r.fields.Token,
      error: r.fields.Error,
      status: r.fields.Status,
      timestamp: r.fields.Timestamp,
      retries: r.fields.Retries || 0
    }));

    return { statusCode: 200, body: JSON.stringify({ queue }) };
  } catch (error) {
    console.error('get-retry-queue error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch retry queue', queue: [] }) };
  }
};
