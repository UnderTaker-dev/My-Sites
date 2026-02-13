const Airtable = require('airtable');
const { sendEmail } = require('./utils/send-email');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Generate verification token
function generateVerificationToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
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

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Find user by email
    const users = await base('Users')
      .select({
        filterByFormula: `LOWER({Email}) = '${email.toLowerCase()}'`,
        maxRecords: 1
      })
      .firstPage();

    if (users.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Email not found' })
      };
    }

    const user = users[0];
    const userFields = user.fields;

    // Check if already verified
    if (userFields.EmailVerified) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is already verified' })
      };
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Update user with new token
    await base('Users').update(user.id, {
      VerificationToken: verificationToken,
      VerificationExpiry: verificationExpiry
    });

    // Send verification email
    const verificationUrl = `${event.headers.origin || 'https://yourdomain.com'}/verify-email.html?token=${verificationToken}`;
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3498db, #9b59b6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button:hover { background: #2980b9; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Hi ${userFields.Name},</p>
      <p>You requested a new verification link. Click the button below to verify your email address:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p><strong>This link will expire in 24 hours.</strong></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2026 UnderTaker | Powered by Monster and bad decisions</p>
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: email,
      subject: '✉️ Verify your email address',
      htmlBody
    });

    console.log('Verification email resent to:', email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Verification email sent! Please check your inbox.'
      })
    };

  } catch (error) {
    console.error('Resend verification error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send verification email. Please try again.'
      })
    };
  }
};
