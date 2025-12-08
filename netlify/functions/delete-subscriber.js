const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { recordId, tableName } = JSON.parse(event.body);

    if (!recordId || !tableName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing recordId or tableName' })
      };
    }

    if (!['Subscribers', 'Unsubscribed'].includes(tableName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid table name' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    await base(tableName).destroy([recordId]);
    
    console.log(`Deleted record ${recordId} from ${tableName}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Record deleted successfully'
      })
    };
  } catch (error) {
    console.error('Delete record error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to delete record'
      })
    };
  }
};
