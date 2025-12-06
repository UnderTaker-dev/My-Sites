const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { recordId } = JSON.parse(event.body);
    
    if (!recordId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Record ID required' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    await base('Subscribers').destroy([recordId]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscriber deleted' })
    };
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete subscriber' })
    };
  }
};
