const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
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

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_TOKEN) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Invalid token' })
      };
    }

    // Fetch users with deletion requests (DeletionRequested = true)
    const requests = [];
    await base('Users').select({
      filterByFormula: '{DeletionRequested} = TRUE()',
      sort: [{ field: 'DeletionRequestedAt', direction: 'desc' }]
    }).eachPage((records, fetchNextPage) => {
      records.forEach(record => {
        const fields = record.fields;
        requests.push({
          id: record.id,
          name: fields.Name || 'Unknown',
          email: fields.Email || '',
          status: fields.Status || 'Active',
          emailVerified: fields.EmailVerified || false,
          createdAt: fields.CreatedAt || '',
          deletionRequestedAt: fields.DeletionRequestedAt || '',
          lastLogin: fields.LastLogin || ''
        });
      });
      fetchNextPage();
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        requests,
        stats: {
          total: requests.length,
          pending: requests.filter(r => r.status === 'Pending Deletion').length
        }
      })
    };

  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch deletion requests', 
        details: error.message 
      })
    };
  }
};
