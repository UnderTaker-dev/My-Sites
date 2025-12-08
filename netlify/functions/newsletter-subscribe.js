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

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Add subscriber to Airtable with Pending status
    // Using only core fields to avoid schema errors
    const createFields = {
      Email: email,
      Status: 'Pending'
    };

    // Add optional fields if they exist (non-blocking)
    try {
      createFields['Subscribed Date'] = new Date().toISOString().split('T')[0];
      createFields['Source'] = 'Homepage Form';
      createFields['IP Address'] = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '::1';
      createFields['Notes'] = 'Awaiting email confirmation';
      createFields['Verification Token'] = verificationToken;
    } catch (e) {
      console.log('Some optional fields not available:', e.message);
    }

    await base('Subscribers').create([
      { fields: createFields }
    ]);
    
    console.log('New subscriber added (pending confirmation):', email);

    // Send confirmation email
    try {
      const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
      const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
      const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
      const SENDER_EMAIL = process.env.SENDER_EMAIL || 'support@mathi4s.com';

      console.log('Email config check:', {
        hasClientId: !!CLIENT_ID,
        hasSecret: !!CLIENT_SECRET,
        hasTenant: !!TENANT_ID,
        senderEmail: SENDER_EMAIL
      });

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
        
        console.log('Token response:', {
          hasToken: !!tokenData.access_token,
          error: tokenData.error
        });

        if (tokenData.access_token) {
          // Short, friendly confirmation link handled via Netlify redirect
          const confirmLink = `https://mathi4s.com/confirm/${verificationToken}`;
          
          const emailPayload = {
            message: {
              subject: '📬 Please Confirm Your Subscription',
              body: {
                contentType: 'HTML',
                content: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 15px;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">👋 Almost There!</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 1rem;">Thanks for subscribing to my newsletter!</p>
                    <p style="font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem;">
                      Just one more step - please confirm your email address by clicking the button below:
                    </p>
                    <div style="text-align: center; margin: 2rem 0;">
                      <a href="${confirmLink}" style="display: inline-block; padding: 1rem 2rem; background: white; color: #667eea; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1.1rem;">
                        ✅ Confirm Subscription
                      </a>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 10px; margin: 2rem 0; font-size: 0.9rem;">
                      <p style="margin: 0;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0.5rem 0 0 0; word-break: break-all;">${confirmLink}</p>
                    </div>
                    <hr style="border: none; border-top: 2px solid rgba(255,255,255,0.3); margin: 2rem 0;">
                    <p style="font-size: 0.85rem; opacity: 0.8;">
                      Didn't sign up? Just ignore this email - no action needed.
                    </p>
                    <p style="font-size: 0.85rem; opacity: 0.8;">
                      This link will expire in 48 hours for security.
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
          };
          
          console.log('Sending confirmation email to:', email);
          console.log('From:', SENDER_EMAIL);
          console.log('Email payload ready for sending');
          
          // Send confirmation email
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
          
          const emailStatus = emailResponse.status;
          const emailText = await emailResponse.text();
          
          console.log('Confirmation email response status:', emailStatus);
          console.log('Email response text:', emailText);
          
          if (!emailResponse.ok) {
            console.error('Email send failed - status:', emailStatus);
            console.error('Email error details:', emailText);
          } else {
            console.log('Confirmation email sent successfully to:', email);
          }
        } else {
          console.error('Failed to get access token:', tokenData.error || 'Unknown error');
        }
      } else {
        console.log('Microsoft Graph not configured - confirmation email skipped');
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue anyway - they can resend later
    }

    // Send admin notification (non-blocking)
    try {
      await fetch(`${event.headers.origin || 'https://mathi4s.com'}/.netlify/functions/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_subscriber',
          data: { email }
        })
      });
    } catch (notifyError) {
      console.error('Failed to send admin notification:', notifyError);
      // Don't fail the subscription if notification fails
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Please check your email to confirm subscription',
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
