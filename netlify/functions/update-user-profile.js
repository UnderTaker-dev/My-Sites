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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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

    const { name } = JSON.parse(event.body || '{}');

    // Validation
    if (!name || name.trim().length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name must be at least 2 characters' })
      };
    }

    // Update user record
    await base('Users').update(userId, {
      Name: name.trim()
    });

    console.log('User profile updated:', userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Profile updated successfully'
      })
    };

  } catch (error) {
    console.error('Update profile error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update profile'
      })
    };
  }
};
