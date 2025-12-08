const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    let admins = [];

    try {
      admins = await base('AdminUsers').select({
        sort: [{ field: 'Created', direction: 'desc' }]
      }).all();
    } catch (err) {
      console.error('AdminUsers read failed:', err.message);
    }

    const users = admins.map(r => ({
      id: r.id,
      email: r.fields.Email,
      name: r.fields.Name,
      role: r.fields.Role || 'Editor',
      status: r.fields.Status || 'Active',
      createdDate: r.fields.Created,
      lastAccess: r.fields['Last Access']
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ users })
    };
  } catch (error) {
    console.error('get-admin-users error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch admin users',
        users: []
      })
    };
  }
};
