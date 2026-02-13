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

    // Check if this is an IP block appeal or account suspension appeal
    let appealType = 'IP_Block';
    let isBlocked = false;
    let userAccount = null;

    // First, check if user account exists and is suspended/inactive
    try {
      const userRecords = await base('Users').select({
        filterByFormula: `LOWER({Email}) = '${email.toLowerCase()}'`,
        maxRecords: 1
      }).firstPage();

      if (userRecords.length > 0) {
        userAccount = userRecords[0];
        const status = userAccount.fields.Status;
        
        if (status === 'Suspended' || status === 'Inactive') {
          appealType = 'Account_' + status;
          isBlocked = true; // Allow appeal for suspended/inactive accounts
        }
      }
    } catch (e) {
      console.error('Error checking user account:', e);
    }

    // If not a suspended account, check if IP is blocked
    if (!isBlocked) {
      try {
        const blockedRecords = await base('BlockedIPs').select({
          filterByFormula: `{IP} = '${ip}'`,
          maxRecords: 1
        }).firstPage();

        if (blockedRecords.length > 0) {
          isBlocked = true;
          appealType = 'IP_Block';
        }
      } catch (e) {
        console.error('Error checking blocked IP:', e);
      }
    }

    // If neither account is suspended nor IP is blocked, reject appeal
    if (!isBlocked) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'No active restrictions found',
          message: 'Your IP address is not blocked and your account is not suspended. If you\'re experiencing issues, please contact support.'
        })
      };
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
      const appealRecord = await base('Appeals').create([{
        fields: {
          IP: ip,
          Email: email,
          Reason: reason,
          Status: 'Pending',
          AppealType: appealType,
          SubmittedDate: new Date().toISOString(),
          UserAgent: event.headers['user-agent'] || 'Unknown',
          TimesAppealed: timesAppealed,
          PreviousStatus: previousStatus
        }
      }]);
      console.log('Appeal saved successfully:', appealRecord[0].id);
    } catch (e) {
      console.error('Failed to save appeal to Airtable:', e.message);
      console.error('Full error:', e);
      // Log but don't fail - still return success to user
    }

    // Send Discord notification about the appeal
    try {
      await fetch(`${event.headers.origin || 'https://mathi4s.com'}/.netlify/functions/send-discord-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'block_appeal',
          data: { ip, email, reason, appealType }
        })
      });
    } catch (notifyError) {
      console.error('Failed to send Discord notification:', notifyError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: appealType.startsWith('Account_') 
          ? 'Account appeal submitted successfully. An admin will review your request shortly.'
          : 'Appeal submitted successfully. An admin will review it shortly.',
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
