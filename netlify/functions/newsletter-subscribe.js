const Airtable = require('airtable');
const fetch = require('node-fetch');
const dns = require('dns').promises;
const crypto = require('crypto');
const { isDisposableEmail } = require('./utils/disposable-emails');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if Airtable credentials are configured
  if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) {
    console.error('Airtable credentials not configured. AIRTABLE_TOKEN:', !!process.env.AIRTABLE_TOKEN, 'AIRTABLE_BASE_ID:', !!process.env.AIRTABLE_BASE_ID);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Newsletter system not configured. Please contact support.'
      })
    };
  }

  const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
  const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
  const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@mathi4s.com';

  if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Email service not configured. Please contact support.'
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
          headers,
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
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Temporary email addresses are not allowed'
          })
        };
    }

    // Server-side rate limit + VPN soft check
    try {
      const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
      const rateResponse = await fetch(`${baseUrl}/.netlify/functions/check-rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'newsletter' })
      });

      const rateData = await rateResponse.json();
      if (!rateData.allowed) {
        return {
          statusCode: rateData.blocked ? 403 : 429,
          headers,
          body: JSON.stringify({
            success: false,
            error: rateData.reason || 'Too many requests. Please try again later.',
            blocked: rateData.blocked || false,
            appealUrl: rateData.appealUrl
          })
        };
      }
    } catch (rateError) {
      // Fail open if rate limit check fails
    }

    // Extract domain and verify it has valid MX records
    const domain = email.split('@')[1];
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return {
          statusCode: 400,
          headers,
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
        headers,
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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';

    if (existing.length > 0) {
      const status = existing[0].get('Status');
      if (status === 'Active') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Already subscribed'
          })
        };
      }

      // Pending: refresh token + expiry and resend verification email
      await base('Subscribers').update([
        {
          id: existing[0].id,
          fields: {
            Status: 'Pending',
            'Verification Token': verificationToken,
            'Verification Expiry': verificationExpiry
          }
        }
      ]);

      await sendVerificationEmail({
        fetch,
        email,
        verificationToken,
        baseUrl,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        tenantId: TENANT_ID,
        senderEmail: SENDER_EMAIL
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Verification email resent. Please check your inbox to confirm.'
        })
      };
    }

    // Add subscriber to Airtable with Pending status
    const createFields = {
      Email: email,
      Status: 'Pending',
      'Verification Token': verificationToken,
      'Verification Expiry': verificationExpiry
    };

    // Add optional fields if they exist (non-blocking)
    try {
      createFields['Subscribed Date'] = new Date().toISOString().split('T')[0];
      createFields['Source'] = 'Homepage Form';
      createFields['IP Address'] = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '::1';
      createFields['Notes'] = 'Pending verification';
    } catch (e) {
      console.log('Some optional fields not available:', e.message);
    }

    await base('Subscribers').create([
      { fields: createFields }
    ]);

    await sendVerificationEmail({
      fetch,
      email,
      verificationToken,
      baseUrl,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tenantId: TENANT_ID,
      senderEmail: SENDER_EMAIL
    });

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
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Please check your email to confirm your subscription.',
        email: email
      })
    };
  } catch (error) {
    console.error('Subscription error:', error);
    const isSchemaError = error?.message?.includes('Unknown field name');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: isSchemaError
          ? 'Newsletter setup is missing required fields. Please add Verification Token and Verification Expiry to Subscribers.'
          : 'Subscription failed'
      })
    };
  }
};

async function sendVerificationEmail({
  fetch,
  email,
  verificationToken,
  baseUrl,
  clientId,
  clientSecret,
  tenantId,
  senderEmail
}) {
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    }
  );

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token');
  }

  const confirmLink = `${baseUrl}/confirm/${verificationToken}`;

  await fetch(
    `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject: '✅ Confirm your newsletter subscription',
          body: {
            contentType: 'HTML',
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 15px;">
                <h1 style="font-size: 2.2rem; margin-bottom: 1rem;">Confirm your subscription</h1>
                <p style="font-size: 1.1rem; line-height: 1.6;">Thanks for subscribing! Please confirm your email to start receiving updates.</p>
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${confirmLink}" style="display: inline-block; background: white; color: #5b5bd6; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600;">Confirm Subscription</a>
                </div>
                <p style="font-size: 0.9rem; opacity: 0.85;">This link expires in 24 hours.</p>
                <p style="font-size: 0.9rem; opacity: 0.85;">If you did not request this, you can ignore this email.</p>
              </div>
            `
          },
          toRecipients: [
            { emailAddress: { address: email } }
          ]
        },
        saveToSentItems: true
      })
    }
  );
}
