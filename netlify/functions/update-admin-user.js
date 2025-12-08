const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id, role } = JSON.parse(event.body);

    if (!id || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Admin ID and role required' })
      };
    }

    if (!['Owner', 'Editor', 'Viewer'].includes(role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid role' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    try {
      await base('AdminUsers').update(id, {
        Role: role
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } catch (err) {
      console.error('AdminUsers update failed:', err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: err.message })
      };
    }
  } catch (error) {
    console.error('update-admin-user error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update admin user' })
    };
  }
};
