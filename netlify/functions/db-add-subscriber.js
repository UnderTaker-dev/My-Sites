const Airtable = require('airtable');
const dns = require('dns').promises;
const { isDisposableEmail } = require('./utils/disposable-emails');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Block disposable/temporary emails
    if (isDisposableEmail(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Temporary email addresses are not allowed' })
      };
    }

    // Verify domain has valid MX records
    const domain = email.split('@')[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid email domain - no mail server found' })
        };
      }
    } catch (dnsError) {
      console.log('DNS verification failed for domain:', domain);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email domain' })
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Check if already subscribed (case-insensitive)
    const existing = await base('Subscribers').select({
      filterByFormula: `LOWER({Email}) = LOWER('${email}')`
    }).firstPage();

    if (existing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Already subscribed' })
      };
    }

    // Add subscriber with minimal required fields
    const createFields = {
      Email: email,
      Status: 'Pending'
    };

    // Try to add optional fields if they exist
    try {
      createFields['Subscribed Date'] = new Date().toISOString().split('T')[0];
      createFields['Source'] = 'Admin Panel';
      createFields['IP Address'] = 'Admin';
      createFields['Notes'] = 'Added by admin';
    } catch (e) {
      console.log('Some optional fields not available');
    }

    await base('Subscribers').create([
      { fields: createFields }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscribed successfully' })
    };
  } catch (error) {
    console.error('Error adding subscriber:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add subscriber' })
    };
  }
};
