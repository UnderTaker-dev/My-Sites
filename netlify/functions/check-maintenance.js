const Airtable = require('airtable');

exports.handler = async (event, context) => {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Get settings from Airtable
    const records = await base('SiteSettings').select({ maxRecords: 1 }).firstPage();
    
    let maintenanceMode = false;
    let trackIpEnabled = true;
    
    if (records.length > 0) {
      maintenanceMode = records[0].fields.MaintenanceMode || false;
      trackIpEnabled = records[0].fields.TrackIPEnabled !== false; // Default true
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        maintenanceMode,
        trackIpEnabled,
        message: 'We\'re performing updates to improve your experience'
      })
    };
  } catch (error) {
    console.error('Check maintenance error:', error);
    // Fail open - allow site to load if Airtable is down
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        maintenanceMode: false,
        trackIpEnabled: true,
        message: 'Service check failed, proceeding normally'
      })
    };
  }
};
