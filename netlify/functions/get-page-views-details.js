const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    const records = await base('PageViews').select({
      sort: [{ field: 'Timestamp', direction: 'desc' }],
      maxRecords: 50 // Last 50 page views
    }).all();
    
    const views = records.map(record => {
      const view = {
        id: record.id,
        page: record.get('Page') || '/',
        timestamp: record.get('Timestamp') || new Date().toISOString(),
        ip: record.get('IP Address') || 'Unknown',
        device: record.get('Device') || 'Unknown',
        browser: record.get('Browser') || 'Unknown',
        os: record.get('OS') || 'Unknown'
      };
      
      // Add optional fields if they exist
      try { view.referrer = record.get('Referrer') || 'Direct'; } catch(e) { view.referrer = 'Direct'; }
      try { view.city = record.get('City') || 'Unknown'; } catch(e) { view.city = 'Unknown'; }
      try { view.country = record.get('Country') || 'Unknown'; } catch(e) { view.country = 'Unknown'; }
      try { view.language = record.get('Language') || 'Unknown'; } catch(e) { view.language = 'Unknown'; }
      try { view.timeZone = record.get('TimeZone') || 'Unknown'; } catch(e) { view.timeZone = 'Unknown'; }
      try { view.screen = record.get('Screen') || ''; } catch(e) { view.screen = ''; }
      try { view.viewport = record.get('Viewport') || ''; } catch(e) { view.viewport = ''; }
      try { view.sessionId = record.get('SessionId') || ''; } catch(e) { view.sessionId = ''; }
      try { view.utmSource = record.get('UTMSource') || ''; } catch(e) { view.utmSource = ''; }
      try { view.utmMedium = record.get('UTMMedium') || ''; } catch(e) { view.utmMedium = ''; }
      try { view.utmCampaign = record.get('UTMCampaign') || ''; } catch(e) { view.utmCampaign = ''; }
      try { view.utmTerm = record.get('UTMTerm') || ''; } catch(e) { view.utmTerm = ''; }
      try { view.utmContent = record.get('UTMContent') || ''; } catch(e) { view.utmContent = ''; }
      
      return view;
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ views: views })
    };
  } catch (error) {
    console.error('Error fetching page views details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch page views details', views: [] })
    };
  }
};
