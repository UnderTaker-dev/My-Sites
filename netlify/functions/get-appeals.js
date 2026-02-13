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

    // Get filter parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status || 'all';
    const sort = queryParams.sort || 'newest';

    console.log('Getting appeals - Status filter:', status, 'Sort:', sort);

    // Build filter formula
    let filterFormulas = [];
    if (status && status !== 'all') {
      filterFormulas.push(`{Status} = '${status}'`);
    }

    const filterFormula = filterFormulas.length > 0
      ? `AND(${filterFormulas.join(', ')})`
      : '';

    console.log('Filter formula:', filterFormula || 'No filter');

    // Determine sort order
    let sortConfig = [];
    switch (sort) {
      case 'oldest':
        sortConfig = [{ field: 'SubmittedDate', direction: 'asc' }];
        break;
      case 'newest':
      default:
        sortConfig = [{ field: 'SubmittedDate', direction: 'desc' }];
        break;
    }

    // Query Airtable
    const selectConfig = {
      sort: sortConfig
    };

    if (filterFormula) {
      selectConfig.filterByFormula = filterFormula;
    }

    const records = await base('Appeals').select(selectConfig).all();

    console.log('Retrieved appeals from Airtable:', records.length);

    // Format appeals
    const appeals = records.map(record => ({
      id: record.id,
      email: record.fields.Email || '',
      ip: record.fields.IP || '',
      reason: record.fields.Reason || '',
      status: record.fields.Status || 'Pending',
      appealType: record.fields.AppealType || 'IP_Block',
      submittedDate: record.fields.SubmittedDate || '',
      timesAppealed: record.fields.TimesAppealed || 1,
      previousStatus: record.fields.PreviousStatus || ''
    }));

    // Calculate statistics
    const stats = {
      total: appeals.length,
      pending: appeals.filter(a => a.status === 'Pending').length,
      approved: appeals.filter(a => a.status === 'Approved').length,
      denied: appeals.filter(a => a.status === 'Denied').length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        appeals: appeals,
        stats: stats
      })
    };

  } catch (error) {
    console.error('Get appeals error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch appeals'
      })
    };
  }
};
