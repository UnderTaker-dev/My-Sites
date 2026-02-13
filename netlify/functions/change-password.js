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

// Hash password
async function hashPassword(password) {
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password hash
async function verifyPassword(password, storedHash) {
  const crypto = require('crypto');
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
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

    const { currentPassword, newPassword } = JSON.parse(event.body || '{}');

    // Validation
    if (!currentPassword || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Current password and new password are required' })
      };
    }

    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'New password must be at least 8 characters' })
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

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.fields.PasswordHash);
    
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Current password is incorrect' })
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await base('Users').update(userId, {
      PasswordHash: hashedPassword
    });

    console.log('User password changed:', userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password changed successfully'
      })
    };

  } catch (error) {
    console.error('Change password error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to change password'
      })
    };
  }
};
