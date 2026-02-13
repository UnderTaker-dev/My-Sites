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

    const appealFields = appeal.fields;
    const appealType = appealFields.AppealType || 'IP_Block';

    // Update appeal status
    await base('Appeals').update(appealId, {
      Status: 'Approved',
      AdminNotes: adminNotes || '',
      ResolvedDate: new Date().toISOString()
    });

    // If account suspension appeal, unsuspend the user
    if (appealType.startsWith('Account_')) {
      try {
        const users = await base('Users')
          .select({
            filterByFormula: `LOWER({Email}) = '${appealFields.Email.toLowerCase()}'`,
            maxRecords: 1
          })
          .firstPage();

        if (users.length > 0) {
          await base('Users').update(users[0].id, {
            Status: 'Active'
          });
        }
      } catch (userError) {
        console.error('Error unsuspending user:', userError);
        // Continue anyway - appeal is approved, just couldn't unsuspend
      }
    }

    console.log('Appeal approved:', appealId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: appealType.startsWith('Account_') 
          ? 'Appeal approved and account unsuspended'
          : 'Appeal approved'
      })
    };

  } catch (error) {
    console.error('Approve appeal error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to approve appeal'
      })
    };
  }
};
