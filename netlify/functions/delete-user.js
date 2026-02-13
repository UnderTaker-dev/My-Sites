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
        body: JSON.stringify({ error: 'Unauthorized: No token provided' })
      };
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.ADMIN_TOKEN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden: Invalid admin token' })
      };
    }

    const { userId } = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Get user info before moving to deleted
    const user = await base('Users').find(userId);
    const userFields = user.fields;
    const userEmail = userFields.Email || 'unknown';
    const userName = userFields.Name || 'unknown';

    // Copy user data to DeletedUsers table
    await base('DeletedUsers').create([
      {
        fields: {
          OriginalUserId: userId,
          Name: userName,
          Email: userEmail,
          Status: userFields.Status || 'Active',
          EmailVerified: userFields.EmailVerified || false,
          CreatedAt: userFields.CreatedAt || new Date().toISOString(),
          DeletedAt: new Date().toISOString(),
          DeletedBy: 'Admin',
          DeletionRequested: userFields.DeletionRequested || false,
          DeletionRequestedAt: userFields.DeletionRequestedAt || null,
          LastLogin: userFields.LastLogin || null,
          OriginalData: JSON.stringify(userFields)
        }
      }
    ]);

    // Now delete from Users table
    await base('Users').destroy(userId);

    // Log the deletion activity
    try {
      await base('ActivityLog').create([
        {
          fields: {
            Type: 'user_deleted',
            Note: `Admin moved user to DeletedUsers: ${userName} (${userEmail})`,
            Email: userEmail,
            Timestamp: new Date().toISOString(),
            Meta: JSON.stringify({ userId, userName, userEmail, deletedBy: 'admin', movedToDeletedUsers: true })
          }
        }
      ]);
    } catch (logError) {
      console.error('Failed to log deletion:', logError);
      // Don't fail the deletion if logging fails
    }

    console.log(`User moved to DeletedUsers: ${userEmail} (ID: ${userId})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User deleted successfully',
        userId,
        userEmail
      })
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete user',
        details: error.message
      })
    };
  }
};
