const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { type, data } = JSON.parse(event.body);

    // Get Microsoft Graph credentials
    const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
    const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
    const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'support@mathi4s.com';
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@mathi4s.com';

    if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
      console.log('Email service not configured');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Notification skipped - email not configured' })
      };
    }

    // Get access token
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
      throw new Error('Failed to get access token');
    }

    // Build notification email based on type
    let subject, message;
    
    if (type === 'new_subscriber') {
      subject = '🎉 New Newsletter Subscriber!';
      message = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 10px;">
          <h2>📧 New Subscriber!</h2>
          <p style="font-size: 1.1rem;">Someone just subscribed to your newsletter:</p>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong style="font-size: 1.2rem;">${data.email}</strong>
          </div>
          <p style="opacity: 0.8; font-size: 0.9rem;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `;
    } else if (type === 'new_donation') {
      subject = '💰 New Donation Received!';
      message = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1abc9c, #16a085); color: white; border-radius: 10px;">
          <h2>💚 Someone Supported You!</h2>
          <p style="font-size: 1.1rem;">You received a new donation:</p>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="font-size: 1.5rem; margin: 5px 0;"><strong>${data.currency} ${data.amount}</strong></p>
            <p style="margin: 5px 0;">From: <strong>${data.email || 'Anonymous'}</strong></p>
          </div>
          <p style="opacity: 0.8; font-size: 0.9rem;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `;
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid notification type' })
      };
    }

    // Send notification email
    await fetch(
      `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            subject: subject,
            body: {
              contentType: 'HTML',
              content: message
            },
            toRecipients: [
              {
                emailAddress: {
                  address: ADMIN_EMAIL
                }
              }
            ]
          },
          saveToSentItems: true
        })
      }
    );

    console.log(`Admin notification sent: ${type}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Notification sent' })
    };

  } catch (error) {
    console.error('Notification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send notification' })
    };
  }
};
