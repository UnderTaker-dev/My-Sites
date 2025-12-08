const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      console.error('Missing Airtable credentials');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const { id, status } = JSON.parse(event.body || '{}');
    const allowed = ['Active', 'Pending'];

    if (!id || !status || !allowed.includes(status)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid id or status' }) };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    const fields = { Status: status };
    try { fields['Notes'] = status === 'Active' ? 'Confirmed by admin' : 'Pending (admin)'; } catch (_) {}
    if (status === 'Active') {
      // Airtable date field may require YYYY-MM-DD; fall back gracefully
      try {
        const iso = new Date().toISOString();
        const dateOnly = iso.split('T')[0];
        fields['Confirmed Date'] = dateOnly;
      } catch (_) {}
      try { fields['Verification Token'] = ''; } catch (_) {}
    }

    await base('Subscribers').update([{ id, fields }]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, status })
    };
  } catch (error) {
    console.error('Update subscriber error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update subscriber' }) };
  }
};
