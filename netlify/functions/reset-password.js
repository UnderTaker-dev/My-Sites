const Airtable = require('airtable');
const crypto = require('crypto');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Hash password with PBKDF2
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { token, newPassword } = JSON.parse(event.body);

    if (!token || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and new password are required' })
      };
    }

    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    // Find user by reset token
    const users = await base('Users')
      .select({
        filterByFormula: `{PasswordResetToken} = '${token}'`,
        maxRecords: 1
      })
      .firstPage();

    if (users.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired reset token' })
      };
    }

    const user = users[0];

    // Check if token is expired
    const resetExpiry = new Date(user.fields.PasswordResetExpiry);
    if (resetExpiry < new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reset token has expired. Please request a new one.' })
      };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await base('Users').update(user.id, {
      PasswordHash: hashedPassword,
      PasswordResetToken: null,
      PasswordResetExpiry: null
    });

    console.log('Password reset successful for:', user.fields.Email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password reset successful! You can now log in with your new password.'
      })
    };

  } catch (error) {
    console.error('Password reset error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to reset password. Please try again.'
      })
    };
  }
};
