const Airtable = require('airtable');
const fetch = require('node-fetch');

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

// Verify password hash
async function verifyPassword(password, storedHash) {
  const crypto = require('crypto');
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    // Verify user token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: No token provided' })
      };
    }

    const token = authHeader.split(' ')[1];
    const userId = verifyToken(token);

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Parse request body
    const { password } = JSON.parse(event.body || '{}');

    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password is required to confirm deletion' })
      };
    }

    // Get user record
    const user = await base('Users').find(userId);
    const userEmail = user.fields.Email;
    const userName = user.fields.Name || 'Unknown';
    const passwordHash = user.fields.PasswordHash;

    // Verify password
    const isValidPassword = await verifyPassword(password, passwordHash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Incorrect password. Please try again.' })
      };
    }

    // Check if already requested deletion
    if (user.fields.DeletionRequested) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Deletion already requested for this account' })
      };
    }

    // Mark user for deletion (admin will process and move to DeletedUsers table)
    await base('Users').update([
      {
        id: userId,
        fields: {
          DeletionRequested: true,
          DeletionRequestedAt: new Date().toISOString()
        }
      }
    ]);

    // Log the deletion request
    try {
      await base('ActivityLog').create([
        {
          fields: {
            Type: 'deletion_request',
            Note: `User requested account deletion: ${userName} (${userEmail})`,
            Email: userEmail,
            Timestamp: new Date().toISOString(),
            Meta: JSON.stringify({ userId, userName, userEmail, requestedAt: new Date().toISOString() })
          }
        }
      ]);
    } catch (logError) {
      console.error('Failed to log deletion request:', logError);
    }

    // Send Discord notification to admins
    try {
      const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
      if (discordWebhook) {
        await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '🚨 Account Deletion Request',
              description: `${userName} has requested account deletion`,
              color: 16711680,
              fields: [
                { name: 'Name', value: userName, inline: true },
                { name: 'Email', value: userEmail, inline: true },
                { name: 'User ID', value: userId, inline: true },
                { name: 'Requested At', value: new Date().toISOString(), inline: false }
              ]
            }]
          })
        });
      }
    } catch (discordError) {
      console.error('Failed to send Discord notification:', discordError);
    }

    console.log(`Account deletion requested: ${userEmail}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account deletion request submitted successfully'
      })
    };

  } catch (error) {
    console.error('Error processing deletion request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process deletion request',
        details: error.message
      })
    };
  }
};
