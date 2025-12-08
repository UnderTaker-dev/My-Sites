const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { type, email, note, meta, adminEmail, adminName } = JSON.parse(event.body || '{}');
    if (!type) return { statusCode: 400, body: JSON.stringify({ error: 'type required' }) };

    // Extract client IP from headers
    const clientIp = event.headers['client-ip'] || 
                     event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     event.headers['x-client-ip'] || 
                     'Unknown';

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    const fields = {
      Type: type,
      Timestamp: new Date().toISOString(),
      'Admin IP': clientIp,
    };
    if (email) fields.Email = email;
    if (note) fields.Note = note;
    if (adminEmail) fields['Admin Email'] = adminEmail;
    if (adminName) fields['Admin Name'] = adminName;
    if (meta) fields.Meta = JSON.stringify(meta).slice(0, 1000);

    try {
      await base('ActivityLog').create([{ fields }]);
    } catch (err) {
      console.error('Activity log write failed (non-fatal):', err.message);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('log-activity error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to log activity' }) };
  }
};
