const Airtable = require('airtable');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { email, reason } = JSON.parse(event.body);
    
    // Get IP from request
    const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || 
               event.headers['client-ip'] || 'Unknown';

    if (!email || !reason) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and reason required' })
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    // Check if this IP is actually blocked
    try {
      const blockedRecords = await base('BlockedIPs').select({
        filterByFormula: `{IP} = '${ip}'`,
        maxRecords: 1
      }).firstPage();

      if (blockedRecords.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ 
            error: 'Your IP is not blocked',
            message: 'Your IP address is not currently blocked. If you\'re experiencing issues, please contact support.'
          })
        };
      }
    } catch (e) {
      console.error('Error checking blocked IP:', e);
    }

    // Check how many times this IP has appealed before
    let timesAppealed = 1;
    let previousStatus = '';
    try {
      const previousAppeals = await base('Appeals').select({
        filterByFormula: `{IP} = '${ip}'`,
        sort: [{field: 'SubmittedDate', direction: 'desc'}]
      }).firstPage();
      
      timesAppealed = previousAppeals.length + 1;
      if (previousAppeals.length > 0) {
        previousStatus = previousAppeals[0].get('Status') || '';
      }
    } catch (e) {
      console.log('Could not check appeal history:', e.message);
    }

    // Save appeal to Airtable
    try {
      await base('Appeals').create([{
        fields: {
          IP: ip,
          Email: email,
          Reason: reason,
          Status: 'Pending',
          SubmittedDate: new Date().toISOString(),
          UserAgent: event.headers['user-agent'] || 'Unknown',
          TimesAppealed: timesAppealed,
          PreviousStatus: previousStatus
        }
      }]);
    } catch (e) {
      console.log('Appeals table may not exist yet:', e.message);
    }

    // Send Discord notification about the appeal
    try {
      await fetch(`${event.headers.origin || 'https://mathi4s.com'}/.netlify/functions/send-discord-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'block_appeal',
          data: { ip, email, reason }
        })
      });
    } catch (notifyError) {
      console.error('Failed to send Discord notification:', notifyError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Appeal submitted successfully. An admin will review it shortly.',
        appealId: Date.now().toString(36)
      })
    };

  } catch (error) {
    console.error('Appeal submission error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit appeal. Please try again.' })
    };
  }
};
