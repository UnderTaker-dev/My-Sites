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
        'Support Me Visible': true,
        'Notify New Subscriber': true,
        'Notify Unsubscribed': true,
        'Notify New Donation': true,
        'Notify VPN Detected': true,
        'Notify User Signup': true,
        'Notify Deletion Request': true,
        'Notify Appeal': true,
        'Notify IP Blocked': true,
        'Notify Error Alert': true,
        'Notify Traffic Spike': true
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
      const notifyNewSubscriber = record?.fields?.['Notify New Subscriber'] !== false;
      const notifyUnsubscribed = record?.fields?.['Notify Unsubscribed'] !== false;
      const notifyNewDonation = record?.fields?.['Notify New Donation'] !== false;
      const notifyVpnDetected = record?.fields?.['Notify VPN Detected'] !== false;
      const notifyUserSignup = record?.fields?.['Notify User Signup'] !== false;
      const notifyDeletionRequest = record?.fields?.['Notify Deletion Request'] !== false;
      const notifyAppeal = record?.fields?.['Notify Appeal'] !== false;
      const notifyIpBlocked = record?.fields?.['Notify IP Blocked'] !== false;
      const notifyErrorAlert = record?.fields?.['Notify Error Alert'] !== false;
      const notifyTrafficSpike = record?.fields?.['Notify Traffic Spike'] !== false;

      return {
        statusCode: 200,
        body: JSON.stringify({
          theme,
          supportMeVisible,
          notifyNewSubscriber,
          notifyUnsubscribed,
          notifyNewDonation,
          notifyVpnDetected,
          notifyUserSignup,
          notifyDeletionRequest,
          notifyAppeal,
          notifyIpBlocked,
          notifyErrorAlert,
          notifyTrafficSpike
        })
      };
    } catch (error) {
      console.error('get-settings error:', error);
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: 'Using defaults',
          theme: 'default',
          supportMeVisible: true,
          notifyNewSubscriber: true,
          notifyUnsubscribed: true,
          notifyNewDonation: true,
          notifyVpnDetected: true,
          notifyUserSignup: true,
          notifyDeletionRequest: true,
          notifyAppeal: true,
          notifyIpBlocked: true,
          notifyErrorAlert: true,
          notifyTrafficSpike: true
        })
      };
    }
  } else if (event.httpMethod === 'POST') {
    try {
      const {
        theme,
        supportMeVisible,
        notifyNewSubscriber,
        notifyUnsubscribed,
        notifyNewDonation,
        notifyVpnDetected,
        notifyUserSignup,
        notifyDeletionRequest,
        notifyAppeal,
        notifyIpBlocked,
        notifyErrorAlert,
        notifyTrafficSpike
      } = JSON.parse(event.body || '{}');

      const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
      
      // Get or create the settings record
      const record = await getOrCreateSettings(base);

      const fields = {};
      
      // Only update fields that are provided
      if (theme !== undefined) fields.Theme = theme;
      if (supportMeVisible !== undefined) fields['Support Me Visible'] = supportMeVisible;
      if (notifyNewSubscriber !== undefined) fields['Notify New Subscriber'] = notifyNewSubscriber;
      if (notifyUnsubscribed !== undefined) fields['Notify Unsubscribed'] = notifyUnsubscribed;
      if (notifyNewDonation !== undefined) fields['Notify New Donation'] = notifyNewDonation;
      if (notifyVpnDetected !== undefined) fields['Notify VPN Detected'] = notifyVpnDetected;
      if (notifyUserSignup !== undefined) fields['Notify User Signup'] = notifyUserSignup;
      if (notifyDeletionRequest !== undefined) fields['Notify Deletion Request'] = notifyDeletionRequest;
      if (notifyAppeal !== undefined) fields['Notify Appeal'] = notifyAppeal;
      if (notifyIpBlocked !== undefined) fields['Notify IP Blocked'] = notifyIpBlocked;
      if (notifyErrorAlert !== undefined) fields['Notify Error Alert'] = notifyErrorAlert;
      if (notifyTrafficSpike !== undefined) fields['Notify Traffic Spike'] = notifyTrafficSpike;

      try {
        await base('Settings').update([{ id: record.id, fields }]);
      } catch (err) {
        console.error('Settings write failed:', err.message);
        return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, ...fields })
      };
    } catch (error) {
      console.error('update-settings error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update settings' }) };
    }
  } else {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
};
