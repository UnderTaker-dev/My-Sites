const Airtable = require('airtable');

// Helper: Get or create Settings record
async function getOrCreateSettings(base) {
  try {
    // Try to read existing settings
    const records = await base('Settings').select({ maxRecords: 1 }).all();
    if (records.length > 0) {
      return records[0];
    }
  } catch (err) {
    console.log('Settings table doesn\'t exist yet, will try to create');
  }

  // Settings table doesn't exist or no records - create default record
  try {
    const created = await base('Settings').create([{
      fields: {
        'Theme': 'default',
        'Support Me Visible': true
      }
    }]);
    console.log('Created default Settings record');
    return created[0];
  } catch (createErr) {
    console.error('Failed to create Settings table/record:', createErr.message);
    throw createErr;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'GET') {
    try {
      const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
      
      const record = await getOrCreateSettings(base);
      
      const theme = record?.fields?.Theme || 'default';
      const supportMeVisible = record?.fields?.['Support Me Visible'] !== false;

      return {
        statusCode: 200,
        body: JSON.stringify({ theme, supportMeVisible })
      };
    } catch (error) {
      console.error('get-settings error:', error);
      return {
        statusCode: 200,
        body: JSON.stringify({ error: 'Using defaults', theme: 'default', supportMeVisible: true })
      };
    }
  } else if (event.httpMethod === 'POST') {
    try {
      const { theme, supportMeVisible } = JSON.parse(event.body || '{}');
      if (!theme) {
        return { statusCode: 400, body: JSON.stringify({ error: 'theme required' }) };
      }

      const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
      
      // Get or create the settings record
      const record = await getOrCreateSettings(base);

      const fields = {
        Theme: theme,
        'Support Me Visible': supportMeVisible !== false
      };

      try {
        await base('Settings').update([{ id: record.id, fields }]);
      } catch (err) {
        console.error('Settings write failed:', err.message);
        return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, theme, supportMeVisible })
      };
    } catch (error) {
      console.error('update-settings error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update settings' }) };
    }
  } else {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
};
