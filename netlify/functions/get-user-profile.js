const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Verify auth token and extract user ID
function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return payload.userId;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get authorization token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const token = authHeader.substring(7);
    const userId = verifyToken(token);

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Get user record
    const user = await base('Users').find(userId);

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userFields = user.fields;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId: user.id,
        name: userFields.Name,
        email: userFields.Email,
        createdAt: userFields.CreatedAt,
        emailVerified: userFields.EmailVerified || false,
        lastLogin: userFields.LastLogin,
        status: userFields.Status || 'Active'
      })
    };

  } catch (error) {
    console.error('Get profile error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve profile'
      })
    };
  }
};
