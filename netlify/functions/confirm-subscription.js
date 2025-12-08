const Airtable = require('airtable');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get token from query parameters
    const token = event.queryStringParameters?.token;
    
    if (!token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <!DOCTYPE html>
          <html><head><title>Invalid Link</title><style>
            body { font-family: Arial; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { text-align: center; background: rgba(0,0,0,0.3); padding: 3rem; border-radius: 20px; max-width: 500px; }
            h1 { font-size: 2.5rem; margin-bottom: 1rem; }
            a { color: #fff; text-decoration: underline; }
          </style></head><body>
            <div class="container">
              <h1>❌ Invalid Link</h1>
              <p>This confirmation link is invalid or expired.</p>
              <p><a href="https://mathi4s.com">Return to homepage</a></p>
            </div>
          </body></html>
        `
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    // Find subscriber with this token
    const records = await base('Subscribers').select({
      filterByFormula: `{Verification Token} = '${token}'`
    }).firstPage();

    if (records.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <!DOCTYPE html>
          <html><head><title>Not Found</title><style>
            body { font-family: Arial; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { text-align: center; background: rgba(0,0,0,0.3); padding: 3rem; border-radius: 20px; max-width: 500px; }
            h1 { font-size: 2.5rem; margin-bottom: 1rem; }
            a { color: #fff; text-decoration: underline; }
          </style></head><body>
            <div class="container">
              <h1>🤔 Subscription Not Found</h1>
              <p>This confirmation link may have already been used or has expired.</p>
              <p><a href="https://mathi4s.com">Return to homepage</a></p>
            </div>
          </body></html>
        `
      };
    }

    const record = records[0];
    const currentStatus = record.get('Status');

    // Check if already confirmed
    if (currentStatus === 'Active') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <!DOCTYPE html>
          <html><head><title>Already Confirmed</title><style>
            body { font-family: Arial; background: linear-gradient(135deg, #1abc9c, #16a085); color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { text-align: center; background: rgba(0,0,0,0.3); padding: 3rem; border-radius: 20px; max-width: 500px; }
            h1 { font-size: 2.5rem; margin-bottom: 1rem; }
            p { font-size: 1.1rem; line-height: 1.6; }
            a { display: inline-block; margin-top: 1rem; padding: 0.8rem 1.5rem; background: white; color: #1abc9c; text-decoration: none; border-radius: 10px; font-weight: 600; }
          </style></head><body>
            <div class="container">
              <h1>✅ Already Confirmed!</h1>
              <p>Your subscription is already active. You'll receive newsletters when we send them!</p>
              <a href="https://mathi4s.com">Back to Homepage</a>
            </div>
          </body></html>
        `
      };
    }

    // Update status to Active with optional fields
    const updateFields = {
      Status: 'Active'
    };

    // Add optional fields if they exist
    try {
      updateFields['Confirmed Date'] = new Date().toISOString().split('T')[0];
      updateFields['Verification Token'] = '';
    } catch (e) {
      console.log('Optional fields not available');
    }

    await base('Subscribers').update([
      {
        id: record.id,
        fields: updateFields
      }
    ]);

    const email = record.get('Email');

    // Send welcome email
    try {
      const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
      const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
      const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
      const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@mathi4s.com';

      if (CLIENT_ID && CLIENT_SECRET && TENANT_ID) {
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
        
        if (tokenData.access_token) {
          // Send welcome email
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
                  subject: '🎉 Welcome to the Newsletter!',
                  body: {
                    contentType: 'HTML',
                    content: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 15px;">
                        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">🎉 Welcome!</h1>
                        <p style="font-size: 1.2rem; margin-bottom: 1rem;">Thanks for confirming your subscription!</p>
                        <p style="font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem;">
                          You're now part of the crew and will get notified when I launch something cool (or weird). 
                          Expect updates about new projects, coding adventures, and probably some Monster-fueled chaos. 🚀
                        </p>
                        <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 10px; margin: 2rem 0;">
                          <p style="margin: 0; font-size: 1rem;">
                            🎯 <strong>What to expect:</strong><br>
                            • Project launches & updates<br>
                            • Coding tips & tricks<br>
                            • Behind-the-scenes content<br>
                            • No spam, just quality content
                          </p>
                        </div>
                        <hr style="border: none; border-top: 2px solid rgba(255,255,255,0.3); margin: 2rem 0;">
                        <p style="font-size: 0.9rem; opacity: 0.8;">
                          Want to unsubscribe? <a href="https://mathi4s.com/unsubscribe.html?email=${encodeURIComponent(email)}" style="color: white; text-decoration: underline;">Click here</a>
                        </p>
                        <p style="font-size: 0.9rem; opacity: 0.8;">
                          Visit: <a href="https://mathi4s.com" style="color: white; text-decoration: underline;">mathi4s.com</a>
                        </p>
                      </div>
                    `
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
        }
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the confirmation if email fails
    }

    // Return success page
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html><head><title>Subscription Confirmed!</title><style>
          body { font-family: Arial; background: linear-gradient(135deg, #1abc9c, #16a085); color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; animation: fadeIn 0.5s; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .container { text-align: center; background: rgba(0,0,0,0.3); padding: 3rem; border-radius: 20px; max-width: 500px; }
          h1 { font-size: 3rem; margin-bottom: 1rem; animation: bounce 0.6s; }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
          p { font-size: 1.1rem; line-height: 1.6; }
          .email { background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 10px; margin: 1.5rem 0; font-weight: 600; }
          a { display: inline-block; margin-top: 1rem; padding: 0.8rem 1.5rem; background: white; color: #1abc9c; text-decoration: none; border-radius: 10px; font-weight: 600; transition: transform 0.3s; }
          a:hover { transform: scale(1.05); }
        </style></head><body>
          <div class="container">
            <h1>🎉 You're In!</h1>
            <p>Your subscription is now <strong>confirmed</strong>!</p>
            <div class="email">${email}</div>
            <p>Check your inbox for a welcome email with all the details.</p>
            <p style="font-size: 0.95rem; opacity: 0.9; margin-top: 1.5rem;">You'll get notified when I launch something cool! 🚀</p>
            <a href="https://mathi4s.com">Back to Homepage</a>
          </div>
        </body></html>
      `
    };

  } catch (error) {
    console.error('Confirmation error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html><head><title>Error</title><style>
          body { font-family: Arial; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .container { text-align: center; background: rgba(0,0,0,0.3); padding: 3rem; border-radius: 20px; max-width: 500px; }
          h1 { font-size: 2.5rem; margin-bottom: 1rem; }
          a { color: #fff; text-decoration: underline; }
        </style></head><body>
          <div class="container">
            <h1>⚠️ Something Went Wrong</h1>
            <p>We couldn't confirm your subscription. Please try again or contact support.</p>
            <p><a href="https://mathi4s.com">Return to homepage</a></p>
          </div>
        </body></html>
      `
    };
  }
};
