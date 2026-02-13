const Airtable = require('airtable');

function getAdminToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = getAdminToken(event);
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    let records = [];

    try {
      records = await base('AllowlistIPs').select({
        sort: [{ field: 'AddedAt', direction: 'desc' }]
      }).all();
    } catch (err) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: [] })
      };
    }

    const items = records.map(record => ({
      id: record.id,
      ip: record.get('IP') || 'Unknown',
      note: record.get('Note') || '',
      addedAt: record.get('AddedAt') || record.get('Created') || null
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch allowlist IPs', items: [] })
    };
  }
};
