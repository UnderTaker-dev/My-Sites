const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
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

    // Get search and filter parameters
    const queryParams = event.queryStringParameters || {};
    const search = queryParams.search || '';
    const status = queryParams.status || '';
    const verified = queryParams.verified || '';
    const sort = queryParams.sort || 'createdDesc';
    const page = parseInt(queryParams.page || '1');
    const limit = parseInt(queryParams.limit || '50');

    // Build filter formula
    let filterFormulas = [];

    if (search) {
      filterFormulas.push(`OR(
        FIND(LOWER('${search.replace(/'/g, "\\'")}'), LOWER({Name})),
        FIND(LOWER('${search.replace(/'/g, "\\'")}'), LOWER({Email}))
      )`);
    }

    if (status && status !== 'all') {
      filterFormulas.push(`{Status} = '${status}'`);
    }

    if (verified === 'true') {
      filterFormulas.push(`{EmailVerified} = TRUE()`);
    } else if (verified === 'false') {
      filterFormulas.push(`{EmailVerified} = FALSE()`);
    }

    const filterFormula = filterFormulas.length > 0
      ? `AND(${filterFormulas.join(', ')})`
      : '';

    // Determine sort order
    let sortConfig = [];
    switch (sort) {
      case 'nameAsc':
        sortConfig = [{ field: 'Name', direction: 'asc' }];
        break;
      case 'nameDesc':
        sortConfig = [{ field: 'Name', direction: 'desc' }];
        break;
      case 'emailAsc':
        sortConfig = [{ field: 'Email', direction: 'asc' }];
        break;
      case 'emailDesc':
        sortConfig = [{ field: 'Email', direction: 'desc' }];
        break;
      case 'createdAsc':
        sortConfig = [{ field: 'CreatedAt', direction: 'asc' }];
        break;
      case 'createdDesc':
      default:
        sortConfig = [{ field: 'CreatedAt', direction: 'desc' }];
        break;
    }

    // Query Airtable
    const selectConfig = {
      sort: sortConfig
    };

    if (filterFormula) {
      selectConfig.filterByFormula = filterFormula;
    }

    const records = await base('Users').select(selectConfig).all();

    // Format users (exclude password hash)
    const users = records.map(record => ({
      id: record.id,
      name: record.fields.Name || '',
      email: record.fields.Email || '',
      createdAt: record.fields.CreatedAt || '',
      lastLogin: record.fields.LastLogin || null,
      emailVerified: record.fields.EmailVerified || false,
      status: record.fields.Status || 'Active'
    }));

    // Calculate pagination
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Calculate statistics
    const stats = {
      total: total,
      active: users.filter(u => u.status === 'Active').length,
      suspended: users.filter(u => u.status === 'Suspended').length,
      verified: users.filter(u => u.emailVerified).length,
      unverified: users.filter(u => !u.emailVerified).length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: paginatedUsers,
        stats: stats,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages,
          hasMore: page < totalPages
        }
      })
    };

  } catch (error) {
    console.error('Get users error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch users'
      })
    };
  }
};
