const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Admin user ID required' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    try {
      await base('AdminUsers').destroy(id);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } catch (err) {
      console.error('AdminUsers delete failed:', err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: err.message })
      };
    }
  } catch (error) {
    console.error('remove-admin-user error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to remove admin user' })
    };
  }
};
