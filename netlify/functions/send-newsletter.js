const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { subject, message, subscribers, count } = JSON.parse(event.body);

    // Validate admin token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Validate input
    if (!subject || !message || !subscribers || !Array.isArray(subscribers)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    // Get Microsoft Graph credentials from environment
    const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
    const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
    const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@mathi4s.com';
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE;

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
      throw new Error('Failed to get access token from Microsoft');
    }

    // Send email to each subscriber with delay to avoid rate limiting
    const results = [];
    let sentCount = 0;
    const failedEmails = [];
    
    console.log(`Attempting to send newsletter to ${subscribers.length} subscriber(s)`);
    
    for (let i = 0; i < subscribers.length; i++) {
      const subscriber = subscribers[i];
      const email = subscriber.email || subscriber;
      
      try {
        console.log(`[${i + 1}/${subscribers.length}] Sending to: ${email}`);
        
        // Add unsubscribe link to message
        const unsubscribeLink = `https://mathi4s.com/unsubscribe.html?email=${encodeURIComponent(email)}`;
        const fullMessage = `
          ${message}
          <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 0.85rem; color: #888; text-align: center;">
            Don't want to receive these emails? 
            <a href="${unsubscribeLink}" style="color: #3498db; text-decoration: none;">Unsubscribe here</a>
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
          console.log(`✅ Successfully sent to: ${email}`);
          results.push({ email, success: true });
          sentCount++;
        } else {
          const error = await emailResponse.text();
          console.error(`❌ Failed to send to ${email}:`, error);
          results.push({ email, success: false, error });
          failedEmails.push(email);
        }
      } catch (err) {
        console.error(`❌ Error sending to ${email}:`, err.message);
        results.push({ email, success: false, error: err.message });
        failedEmails.push(email);
      }
      
      // Add delay between sends to avoid rate limiting (200ms)
      if (i < subscribers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Newsletter results: ${sentCount} sent, ${results.length - sentCount} failed`);

    // Log to ActivityLog if available
    if (AIRTABLE_TOKEN && AIRTABLE_BASE) {
      try {
        await logNewsletterActivity(AIRTABLE_TOKEN, AIRTABLE_BASE, subject, sentCount, results.length - sentCount);
      } catch (logErr) {
        console.error('Warning: Failed to log newsletter activity:', logErr.message);
        // Don't fail if logging fails
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sentCount: sentCount,
        totalAttempted: subscribers.length,
        failedCount: results.length - sentCount,
        message: `Newsletter sent to ${sentCount} of ${subscribers.length} subscribers`,
        results: results
      })
    };

  } catch (error) {
    console.error('Send newsletter error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send newsletter',
        details: error.message
      })
    };
  }
};

// Helper function to log newsletter activity to Airtable
async function logNewsletterActivity(token, base, subject, sentCount, failedCount) {
  const response = await fetch(
    `https://api.airtable.com/v0/${base}/ActivityLog`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              'Type': 'newsletter_sent',
              'Note': `Newsletter sent by admin: "${subject}" to ${sentCount} subscribers (${failedCount} failed)`,
              'Email': 'admin@system',
              'Timestamp': new Date().toISOString(),
              'Meta': JSON.stringify({
                subject,
                sentCount,
                failedCount,
                totalAttempted: sentCount + failedCount
              })
            }
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to log activity: ${response.status}`);
  }

  return await response.json();
}
