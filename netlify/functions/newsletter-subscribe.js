const Airtable = require('airtable');
const fetch = require('node-fetch');
const dns = require('dns').promises;
const { isDisposableEmail } = require('./utils/disposable-emails');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if Airtable credentials are configured
  if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
    console.error('Airtable credentials not configured. AIRTABLE_TOKEN:', !!process.env.AIRTABLE_TOKEN, 'AIRTABLE_BASE_ID:', !!process.env.AIRTABLE_BASE_ID);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Newsletter system not configured. Please contact support.'
      })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid email format'
        })
      };
    }

    // Block disposable/temporary emails
    if (isDisposableEmail(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Temporary email addresses are not allowed'
        })
      };
    }

    // Extract domain and verify it has valid MX records
    const domain = email.split('@')[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Invalid email domain - no mail server found'
          })
        };
      }
    } catch (dnsError) {
      console.log('DNS verification failed for domain:', domain);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid email domain'
        })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Check if already subscribed (case-insensitive)
    const existing = await base('Subscribers').select({
      filterByFormula: `LOWER({Email}) = LOWER('${email}')`
    }).firstPage();

    if (existing.length > 0) {
      const status = existing[0].get('Status');
      if (status === 'Active') {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Already subscribed'
          })
        };
      } else if (status === 'Pending') {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Please check your email to confirm subscription'
          })
        };
      }
    }

    // Add subscriber to Airtable with Active status (instant subscription)
    // Using only core fields to avoid schema errors
    const createFields = {
      Email: email,
      Status: 'Active' // Changed from Pending to Active - no verification needed
    };

    // Add optional fields if they exist (non-blocking)
    try {
      createFields['Subscribed Date'] = new Date().toISOString().split('T')[0];
      createFields['Source'] = 'Homepage Form';
      createFields['IP Address'] = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '::1';
      createFields['Notes'] = 'Instant subscription (no verification required)';
    } catch (e) {
      console.log('Some optional fields not available:', e.message);
    }

    await base('Subscribers').create([
      { fields: createFields }
    ]);
    
    console.log('New subscriber added (instant active):', email);

    // Optional: Send welcome email (no verification needed)
    // Commented out for now - subscribers are active immediately
    /* 
    try {
      // Welcome email logic here if needed
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    */

    // Send Discord notification about new subscriber (non-blocking)
    try {
      await fetch(`${event.headers.origin || 'https://mathi4s.com'}/.netlify/functions/send-discord-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_subscriber',
          data: { email, source: 'Website' }
        })
      });
    } catch (notifyError) {
      console.error('Failed to send Discord notification:', notifyError);
      // Don't fail the subscription if notification fails
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Successfully subscribed! You\'ll receive updates soon.',
        email: email
      })
    };
  } catch (error) {
    console.error('Subscription error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Subscription failed'
      })
    };
  }
};
