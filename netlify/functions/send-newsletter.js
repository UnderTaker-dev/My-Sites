const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { subject, message, subscribers } = JSON.parse(event.body);

    // Validate admin token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Get Microsoft Graph credentials from environment
    const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
    const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
    const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@mathi4s.com';

    if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'Missing Microsoft Graph credentials in environment variables'
        })
      };
    }

    // Get access token from Microsoft
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

    // Send email to each subscriber
    const results = [];
    for (const email of subscribers) {
      try {
        // Add unsubscribe link to message
        const unsubscribeLink = `https://mathi4s.com/unsubscribe.html?email=${encodeURIComponent(email)}`;
        const fullMessage = `
          ${message}
          <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 0.85rem; color: #888; text-align: center;">
            Don't want to receive these emails? 
            <a href="${unsubscribeLink}" style="color: #3498db;">Unsubscribe here</a>
          </p>
        `;
        
        const emailResponse = await fetch(
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
                  content: fullMessage
                },
                toRecipients: [
                  {
                    emailAddress: {
                      address: email
                    }
                  }
                ]
              },
              saveToSentItems: true
            })
          }
        );

        if (emailResponse.ok) {
          results.push({ email, success: true });
        } else {
          const error = await emailResponse.text();
          results.push({ email, success: false, error });
        }
      } catch (err) {
        results.push({ email, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Sent ${successCount} emails, ${failedCount} failed`,
        results: results
      })
    };

  } catch (error) {
    console.error('Send email error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send emails',
        details: error.message
      })
    };
  }
};
