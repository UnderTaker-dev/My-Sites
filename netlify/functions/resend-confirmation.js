const Airtable = require('airtable');
const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id, email } = JSON.parse(event.body || '{}');
    if (!id || !email) return { statusCode: 400, body: JSON.stringify({ error: 'Missing id or email' }) };

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);

    // Fetch record to ensure it exists and get current token
    const record = await base('Subscribers').find(id);
    if (!record) return { statusCode: 404, body: JSON.stringify({ error: 'Subscriber not found' }) };

    // Check throttle: Last resent within 60 minutes
    if (record.fields['Last Resent']) {
      const lastResent = new Date(record.fields['Last Resent']);
      const now = new Date();
      const minutesSince = (now - lastResent) / (1000 * 60);
      
      if (minutesSince < 60) {
        return {
          statusCode: 429,
          body: JSON.stringify({
            error: 'Too many resend attempts. Please wait.',
            minutesRemaining: Math.ceil(60 - minutesSince)
          })
        };
      }
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update token + status pending + last resent time
    try {
      await base('Subscribers').update([{ 
        id, 
        fields: { 
          'Verification Token': verificationToken, 
          'Status': 'Pending',
          'Last Resent': new Date().toISOString()
        } 
      }]);
    } catch (err) {
      console.error('Update token failed:', err.message);
    }

    // Send confirmation email (reuse logic)
    const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
    const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
    const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@mathi4s.com';

    if (!(CLIENT_ID && CLIENT_SECRET && TENANT_ID)) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Email not configured' }) };
    }

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        })
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get access token' }) };
    }

    const confirmLink = `https://mathi4s.com/confirm/${verificationToken}`;
    const emailPayload = {
      message: {
        subject: '📬 Please Confirm Your Subscription',
        body: {
          contentType: 'HTML',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f6f7fb; color: #111827; border-radius: 16px;">
              <div style="background: #ffffff; padding: 24px; border-radius: 14px; border: 1px solid #e5e7eb;">
                <h1 style="font-size: 22px; margin: 0 0 12px 0; color: #111827;">👋 Almost There!</h1>
                <p style="font-size: 15px; margin: 0 0 18px 0; color: #374151;">Please confirm your subscription.</p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${confirmLink}" style="display: inline-block; padding: 12px 22px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">
                    ✅ Confirm Subscription
                  </a>
                </div>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">If you didn’t request this, you can ignore it.</p>
                <p style="font-size: 12px; color: #9ca3af; margin: 16px 0 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #4f46e5; word-break: break-all; margin: 4px 0 0 0;">${confirmLink}</p>
              </div>
            </div>
          `
        },
        toRecipients: [{ emailAddress: { address: email } }]
      },
      saveToSentItems: true
    };

    const emailResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      }
    );

    const status = emailResponse.status;
    const text = await emailResponse.text();

    if (!emailResponse.ok) {
      console.error('Resend email failed:', status, text);
      // Optional retry queue
      try {
        await base('EmailQueue').create([{ fields: { Email: email, Token: verificationToken, Status: 'Failed', Error: text } }]);
      } catch (err) {
        console.error('Queue write failed (non-fatal):', err.message);
      }
      return { statusCode: 500, body: JSON.stringify({ error: 'Email send failed', status, text }) };
    }

    // Log activity
    try {
      await fetch((event.headers.origin || 'https://mathi4s.com') + '/.netlify/functions/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'resend_confirmation', email, note: 'Admin resend', meta: { status } })
      });
    } catch (err) {
      console.error('Log activity failed (non-fatal):', err.message);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('resend-confirmation error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Resend failed' }) };
  }
};
