const Airtable = require('airtable');

exports.handler = async (event, context) => {
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Get settings from Airtable
    const records = await base('SiteSettings').select({ maxRecords: 1 }).firstPage();
    
    let maintenanceMode = false;
    let trackIpEnabled = true;
    let maintenanceMessage = 'We\'re performing updates to improve your experience';
    let maintenanceEndsAt = null;
    let maintenanceBypassCode = null;
    
    if (records.length > 0) {
      maintenanceMode = records[0].fields.MaintenanceMode || false;
      trackIpEnabled = records[0].fields.TrackIPEnabled !== false; // Default true
      maintenanceMessage = records[0].fields.MaintenanceMessage || maintenanceMessage;
      maintenanceEndsAt = records[0].fields.MaintenanceEndsAt || null;
      maintenanceBypassCode = records[0].fields.MaintenanceBypassCode || null;
    }

    const bypassParam = event.queryStringParameters?.bypass;
    const bypassed = !!(maintenanceMode && maintenanceBypassCode && bypassParam && bypassParam === maintenanceBypassCode);
    if (bypassed) {
      maintenanceMode = false;
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
        maintenanceMessage,
        maintenanceEndsAt,
        bypassed
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
        maintenanceMessage: 'Service check failed, proceeding normally',
        maintenanceEndsAt: null,
        bypassed: false
      })
    };
  }
};
