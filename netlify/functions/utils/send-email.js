const fetch = require('node-fetch');

/**
 * Send email using Microsoft Graph API
 * Requires MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, SENDER_EMAIL in env
 */
async function sendEmail({ to, subject, htmlBody, textBody }) {
  try {
    // Get access token from Microsoft
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
    
    const tokenParams = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Send email via Microsoft Graph
    const emailEndpoint = `https://graph.microsoft.com/v1.0/users/${process.env.SENDER_EMAIL}/sendMail`;
    
    const emailBody = {
      message: {
        subject: subject,
        body: {
          contentType: htmlBody ? 'HTML' : 'Text',
          content: htmlBody || textBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      },
      saveToSentItems: false
    };

    const emailResponse = await fetch(emailEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailBody)
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

module.exports = { sendEmail };
