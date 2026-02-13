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
      records = await base('VpnAlerts').select({
        sort: [{ field: 'LastSeen', direction: 'desc' }],
        maxRecords: 200
      }).all();
    } catch (err) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ alerts: [], stats: { total: 0, open: 0, resolved: 0, blocked: 0, allowlisted: 0, ignored: 0 } })
      };
    }

    const alerts = records.map(record => ({
      id: record.id,
      ip: record.get('IP') || 'Unknown',
      action: record.get('Action') || 'Unknown',
      status: record.get('Status') || 'Open',
      count: record.get('Count') || 1,
      firstSeen: record.get('FirstSeen') || record.get('Created') || null,
      lastSeen: record.get('LastSeen') || record.get('Modified') || null,
      type: record.get('Type') || 'Unknown',
      risk: record.get('Risk') || 'Unknown',
      asn: record.get('ASN') || 'Unknown',
      note: record.get('Note') || record.get('AdminNote') || ''
    }));

    const stats = {
      total: alerts.length,
      open: alerts.filter(a => a.status === 'Open').length,
      resolved: alerts.filter(a => a.status === 'Resolved').length,
      blocked: alerts.filter(a => a.status === 'Blocked').length,
      allowlisted: alerts.filter(a => a.status === 'Allowlisted').length,
      ignored: alerts.filter(a => a.status === 'Ignored').length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ alerts, stats })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch VPN alerts', alerts: [], stats: {} })
    };
  }
};
