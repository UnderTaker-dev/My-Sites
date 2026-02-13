const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

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
    // Verify admin authorization
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: No token provided' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_TOKEN) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Invalid admin token' })
      };
    }

    const { userId, approve } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Get user info
    const user = await base('Users').find(userId);
    const userFields = user.fields;
    const userEmail = userFields.Email || 'unknown';
    const userName = userFields.Name || 'unknown';

    if (approve) {
      // Approve deletion: Move to DeletedUsers and delete from Users
      
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
            DeletedBy: 'User Request',
            DeletionRequested: true,
            DeletionRequestedAt: userFields.DeletionRequestedAt || null,
            LastLogin: userFields.LastLogin || null,
            OriginalData: JSON.stringify(userFields)
          }
        }
      ]);

      // Delete user from Users table
      await base('Users').destroy([userId]);

      // Log to activity log
      await base('ActivityLog').create([
        {
          fields: {
            Type: 'deletion_approved',
            Note: `Approved deletion request for ${userName} (${userEmail}) and moved user to DeletedUsers table`,
            Email: userEmail,
            Timestamp: new Date().toISOString()
          }
        }
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `User ${userEmail} deleted successfully`,
          action: 'approved'
        })
      };

    } else {
      // Deny deletion: Clear deletion request flags
      await base('Users').update([
        {
          id: userId,
          fields: {
            DeletionRequested: false,
            DeletionRequestedAt: null,
            Status: 'Active' // Restore to active status
          }
        }
      ]);

      // Log to activity log
      await base('ActivityLog').create([
        {
          fields: {
            Type: 'deletion_denied',
            Note: `Denied deletion request for ${userName} (${userEmail})`,
            Email: userEmail,
            Timestamp: new Date().toISOString()
          }
        }
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `Deletion request denied for ${userEmail}`,
          action: 'denied'
        })
      };
    }

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
