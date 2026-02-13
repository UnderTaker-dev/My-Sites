const Airtable = require('airtable');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, name, role } = JSON.parse(event.body);

    if (!email || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and name required' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Generate invite token
    const inviteToken = crypto.randomBytes(16).toString('hex');

    try {
      const record = await base('AdminUsers').create({
        Email: email,
        Name: name,
        Role: role || 'Editor',
        Status: 'Active',
        Created: new Date().toISOString()
      });

      return {
        statusCode: 201,
        body: JSON.stringify({
          success: true,
          id: record.id
        })
      };
    } catch (err) {
      console.error('AdminUsers create failed:', err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: err.message })
      };
    }
  } catch (error) {
    console.error('add-admin-user error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add admin user' })
    };
  }
};
