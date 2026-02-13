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

    const { appealId, adminNotes } = JSON.parse(event.body);

    if (!appealId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Appeal ID is required' })
      };
    }

    // Get appeal details
    const appeal = await base('Appeals').find(appealId);
    
    if (!appeal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Appeal not found' })
      };
    }

    // Update appeal status
    await base('Appeals').update(appealId, {
      Status: 'Denied',
      AdminNotes: adminNotes || '',
      ResolvedDate: new Date().toISOString()
    });

    console.log('Appeal denied:', appealId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Appeal denied'
      })
    };

  } catch (error) {
    console.error('Deny appeal error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to deny appeal'
      })
    };
  }
};
