const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    let records = [];

    try {
      records = await base('PageViews').select({
        maxRecords: 1000,
        sort: [{ field: 'Timestamp', direction: 'desc' }]
      }).all();
    } catch (err) {
      console.error('PageViews read failed:', err.message);
    }

    // Aggregate by page path
    const pageStats = {};
    const referrerStats = {};

    records.forEach(r => {
      const page = r.fields.Page || 'Home';
      const referrer = r.fields.Referrer || 'Direct';

      pageStats[page] = (pageStats[page] || 0) + 1;
      referrerStats[referrer] = (referrerStats[referrer] || 0) + 1;
    });

    // Sort and take top 5
    const topPages = Object.entries(pageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page, count]) => ({ page, count }));

    const topReferrers = Object.entries(referrerStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([referrer, count]) => ({ referrer, count }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        topPages,
        topReferrers,
        totalPageViews: records.length
      })
    };
  } catch (error) {
    console.error('get-page-stats error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch page statistics',
        topPages: [],
        topReferrers: [],
        totalPageViews: 0
      })
    };
  }
};
