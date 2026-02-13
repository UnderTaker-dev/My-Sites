const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      console.error('Missing Airtable credentials');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          subscribers: [],
          unsubscribed: []
        })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Fetch subscribers
    let subscribers = [];
    try {
      const subscriberRecords = await base('Subscribers').select().all();
      subscribers = subscriberRecords.map(record => ({
        id: record.id,
        email: record.fields.Email,
        date: record.fields['Subscribed Date'] || record.fields.Date,
        status: record.fields.Status || 'Active',
        source: record.fields.Source || record.fields['Signup Source'] || '',
        ip: record.fields['IP Address'] || '',
        confirmedDate: record.fields['Confirmed Date'] || '',
        verificationExpiry: record.fields['Verification Expiry'] || '',
        lastResent: record.fields['Last Resent'] || ''
      }));
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    }
    
    // Fetch unsubscribed users
    let unsubscribed = [];
    try {
      const unsubscribedRecords = await base('Unsubscribed').select().all();
      unsubscribed = unsubscribedRecords.map(record => ({
        id: record.id,
        email: record.fields.Email,
        date: record.fields['Unsubscribed Date'] || record.fields.Date,
        reason: record.fields.Reason || '',
        ip: record.fields['IP Address'] || ''
      }));
    } catch (error) {
      console.error('Error fetching unsubscribed:', error);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        subscribers: subscribers,
        unsubscribed: unsubscribed
      })
    };
  } catch (error) {
    console.error('Get subscribers error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch subscribers',
        subscribers: [],
        unsubscribed: []
      })
    };
  }
};
