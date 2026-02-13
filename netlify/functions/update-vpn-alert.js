const Airtable = require('airtable');

function getAdminToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

async function findRecordByIp(base, tableName, ip) {
  const records = await base(tableName).select({
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
    const { alertId, action, ip, note, expiresAt } = JSON.parse(event.body || '{}');

    if (!alertId || !action || !ip) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'alertId, action, and ip are required' }) };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    const now = new Date().toISOString();
    const normalizedAction = String(action).toLowerCase();

    const alertFields = {
      LastActionAt: now
    };

    if (note) {
      alertFields.AdminNote = String(note).trim();
    }

    if (normalizedAction === 'resolve') {
      alertFields.Status = 'Resolved';
    } else if (normalizedAction === 'ignore') {
      alertFields.Status = 'Ignored';
    } else if (normalizedAction === 'block') {
      alertFields.Status = 'Blocked';
      const reason = note ? `Manual block: ${note}` : 'Manual block from VPN alerts';
      const existing = await findRecordByIp(base, 'BlockedIPs', ip);
      const fields = {
        IP: ip,
        Reason: reason,
        BlockedDate: now,
        AutoBlocked: false
      };
      if (expiresAt) fields.ExpiresAt = expiresAt;

      if (existing) {
        await base('BlockedIPs').update([{ id: existing.id, fields }]);
      } else {
        await base('BlockedIPs').create([{ fields }]);
      }
    } else if (normalizedAction === 'allowlist') {
      alertFields.Status = 'Allowlisted';
      const existing = await findRecordByIp(base, 'AllowlistIPs', ip);
      const fields = {
        IP: ip,
        Note: note || 'Allowlisted from VPN alerts',
        AddedAt: now
      };

      if (existing) {
        await base('AllowlistIPs').update([{ id: existing.id, fields }]);
      } else {
        await base('AllowlistIPs').create([{ fields }]);
      }
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
    }

    await base('VpnAlerts').update([{ id: alertId, fields: alertFields }]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update VPN alert' })
    };
  }
};
