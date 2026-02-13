const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify admin token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.substring(7);
    if (token !== process.env.ADMIN_TOKEN) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid admin token' })
      };
    }

    const { userId, status, emailVerified } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Build update object
    const updates = {};

    if (status !== undefined) {
      if (!['Active', 'Suspended', 'Inactive'].includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status value' })
        };
      }
      updates.Status = status;
    }

    if (emailVerified !== undefined) {
      updates.EmailVerified = emailVerified;
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No fields to update' })
      };
    }

    // Update user
    const record = await base('Users').update(userId, updates);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User updated successfully',
        user: {
          id: record.id,
          status: record.fields.Status,
          emailVerified: record.fields.EmailVerified
        }
      })
    };

  } catch (error) {
    console.error('Update user error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update user'
      })
    };
  }
};
