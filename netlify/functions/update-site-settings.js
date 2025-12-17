const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { maintenanceMode, trackIpEnabled } = JSON.parse(event.body);
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Get existing settings record or create new one
    const records = await base('SiteSettings').select({ maxRecords: 1 }).firstPage();
    
    const fields = {
      MaintenanceMode: maintenanceMode,
      TrackIPEnabled: trackIpEnabled,
      LastUpdated: new Date().toISOString()
    };

    if (records.length > 0) {
      // Update existing
      await base('SiteSettings').update([{
        id: records[0].id,
        fields: fields
      }]);
    } else {
      // Create new
      await base('SiteSettings').create([{ fields }]);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, settings: fields })
    };
  } catch (error) {
    console.error('Update settings error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
