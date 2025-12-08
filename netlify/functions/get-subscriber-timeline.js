const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    const { subscriberId, email } = event.queryStringParameters || {};
    
    if (!subscriberId && !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'subscriberId or email required' }) };
    }

    let subscriber = null;
    let activities = [];

    try {
      if (subscriberId) {
        subscriber = await base('Subscribers').find(subscriberId);
      } else if (email) {
        const records = await base('Subscribers').select({
          filterByFormula: `{Email} = '${email}'`
        }).firstPage();
        subscriber = records[0];
      }
    } catch (err) {
      console.error('Subscriber lookup failed:', err.message);
    }

    if (!subscriber) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Subscriber not found', timeline: [] }) };
    }

    try {
      activities = await base('ActivityLog').select({
        filterByFormula: `{Email} = '${subscriber.fields.Email}'`,
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        maxRecords: 50
      }).all();
    } catch (err) {
      console.error('Activity log read failed:', err.message);
    }

    const timeline = [
      {
        type: 'Subscribed',
        timestamp: subscriber.fields['Subscribed Date'] || subscriber.createdTime,
        icon: '✅'
      }
    ];

    if (subscriber.fields['Confirmed Date']) {
      timeline.push({
        type: 'Confirmed',
        timestamp: subscriber.fields['Confirmed Date'],
        icon: '📧'
      });
    }

    activities.forEach(a => {
      timeline.push({
        type: a.fields.Type,
        timestamp: a.fields.Timestamp,
        icon: '📝',
        note: a.fields.Note
      });
    });

    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      body: JSON.stringify({
        email: subscriber.fields.Email,
        status: subscriber.fields.Status || 'Active',
        timeline: timeline.slice(0, 20)
      })
    };
  } catch (error) {
    console.error('get-subscriber-timeline error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch timeline', timeline: [] }) };
  }
};
