const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    let unsubscribed = [];
    try {
      unsubscribed = await base('Unsubscribed').select().all();
    } catch (err) {
      console.error('Unsubscribed read failed:', err.message);
    }

    const reasonCounts = {};
    unsubscribed.forEach(r => {
      const reason = (r.fields.Reason || 'Not specified').trim();
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const stats = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return { statusCode: 200, body: JSON.stringify({ stats, total: unsubscribed.length }) };
  } catch (error) {
    console.error('get-unsubscribe-stats error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch stats', stats: [], total: 0 }) };
  }
};
