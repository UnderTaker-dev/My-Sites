const Airtable = require('airtable');

function getAdminToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

async function findRecordByIp(base, ip) {
  const records = await base('AllowlistIPs').select({
    filterByFormula: `{IP} = '${ip}'`,
    maxRecords: 1
  }).firstPage();
  return records[0] || null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = getAdminToken(event);
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const { id, ip } = JSON.parse(event.body || '{}');
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    if (id) {
      await base('AllowlistIPs').destroy([id]);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, removed: true }) };
    }

    if (ip) {
      const existing = await findRecordByIp(base, ip);
      if (existing) {
        await base('AllowlistIPs').destroy([existing.id]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, removed: true }) };
      }
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'IP not found' }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'id or ip is required' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to remove allowlist IP' }) };
  }
};
