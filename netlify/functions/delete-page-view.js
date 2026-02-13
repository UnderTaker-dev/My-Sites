const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { recordId, recordIds } = JSON.parse(event.body || '{}');
    const ids = Array.isArray(recordIds) ? recordIds.filter(Boolean) : (recordId ? [recordId] : []);

    if (ids.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Record ID required' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    await base('PageViews').destroy(ids);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, deleted: ids.length })
    };
  } catch (error) {
    console.error('Error deleting page views:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete page views' })
    };
  }
};
