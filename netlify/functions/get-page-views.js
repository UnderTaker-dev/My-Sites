const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('PageViews').select().all();
    
    // Return just the total count
    return {
      statusCode: 200,
      body: JSON.stringify({ total: records.length })
    };
  } catch (error) {
    console.error('Error fetching page views:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch page views', total: 0 })
    };
  }
};
