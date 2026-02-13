const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Get credentials from environment variables
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'UndeTaker';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

    // Validate credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Return the admin token for API access
      if (!ADMIN_TOKEN) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Server configuration error: ADMIN_TOKEN not set'
          })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          token: ADMIN_TOKEN,
          message: 'Authentication successful'
        })
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      };
    }
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Authentication failed'
      })
    };
  }
};
