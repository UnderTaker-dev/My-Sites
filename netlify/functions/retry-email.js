const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) };

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    try {
      await base('EmailQueue').update([{ id, fields: { Status: 'Queued', Retries: 0 } }]);
    } catch (err) {
      console.error('Update EmailQueue failed:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to requeue email' }) };
    }

    // Log activity
    try {
      await fetch((event.headers.origin || 'https://mathi4s.com') + '/.netlify/functions/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual_retry', note: 'Admin retried failed email', meta: { queueId: id } })
      });
    } catch (err) {
      console.error('Log activity failed (non-fatal):', err.message);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('retry-email error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Retry failed' }) };
  }
};
