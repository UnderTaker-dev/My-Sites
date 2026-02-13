const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { maintenanceMode, trackIpEnabled, maintenanceMessage, maintenanceEndsAt, maintenanceBypassCode } = JSON.parse(event.body);
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Get existing settings record or create new one
    const records = await base('SiteSettings').select({ maxRecords: 1 }).firstPage();
    
    const fields = {
      LastUpdated: new Date().toISOString()
    };

    if (maintenanceMode !== undefined) fields.MaintenanceMode = maintenanceMode;
    if (trackIpEnabled !== undefined) fields.TrackIPEnabled = trackIpEnabled;
    if (maintenanceMessage !== undefined) fields.MaintenanceMessage = maintenanceMessage || '';
    if (maintenanceEndsAt !== undefined) fields.MaintenanceEndsAt = maintenanceEndsAt || null;
    if (maintenanceBypassCode !== undefined) fields.MaintenanceBypassCode = maintenanceBypassCode || null;

    const applyUpdate = async (targetFields) => {
      if (records.length > 0) {
        await base('SiteSettings').update([{
          id: records[0].id,
          fields: targetFields
        }]);
      } else {
        await base('SiteSettings').create([{ fields: targetFields }]);
      }
    };

    try {
      await applyUpdate(fields);
    } catch (err) {
      if (err?.error === 'UNKNOWN_FIELD_NAME' && err?.message) {
        const match = err.message.match(/"([^"]+)"/);
        const unknownField = match ? match[1] : null;
        if (unknownField && Object.prototype.hasOwnProperty.call(fields, unknownField)) {
          const retryFields = { ...fields };
          delete retryFields[unknownField];
          await applyUpdate(retryFields);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
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
