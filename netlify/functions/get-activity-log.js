const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    let records = [];
    try {
      records = await base('ActivityLog').select({
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        maxRecords: 50
      }).all();
    } catch (err) {
      console.error('Activity log read failed:', err.message);
    }

    const items = records.map(r => ({
      id: r.id,
      type: r.fields.Type,
      email: r.fields.Email,
      note: r.fields.Note,
      meta: r.fields.Meta,
      adminEmail: r.fields['Admin Email'],
      adminName: r.fields['Admin Name'],
      adminIp: r.fields['Admin IP'],
      timestamp: r.fields.Timestamp
    }));

    return { statusCode: 200, body: JSON.stringify({ items }) };
  } catch (error) {
    console.error('get-activity-log error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch activity log', items: [] }) };
  }
};
