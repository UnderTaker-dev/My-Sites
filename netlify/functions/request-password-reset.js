const Airtable = require('airtable');
const crypto = require('crypto');
const { sendEmail } = require('./utils/send-email');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Generate reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

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

    // Always return success (don't reveal if email exists)
    if (users.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'If that email is registered, a password reset link has been sent.'
        })
      };
    }

    const user = users[0];

    // Generate reset token and expiry (1 hour)
    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Update user with reset token
    await base('Users').update(user.id, {
      PasswordResetToken: resetToken,
      PasswordResetExpiry: resetExpiry
    });

    // Send reset email
    try {
      const resetUrl = `${event.headers.origin || 'https://yourdomain.com'}/reset-password.html?token=${resetToken}`;
      
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #e74c3c, #c0392b); color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; color: #333333; }
    .content p { color: #333333; margin: 10px 0; }
    .content strong { color: #e74c3c; }
    .button { display: inline-block; background: #e74c3c; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .button:hover { background: #c0392b; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ffffff; margin: 0;">🔑 Password Reset Request</h1>
    </div>
    <div class="content">
      <p style="color: #333333;">Hi <strong style="color: #333333;">${user.fields.Name}</strong>,</p>
      <p style="color: #333333;">We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
      </div>
      <div class="warning">
        <p style="color: #856404; margin: 0;"><strong>⏱️ This link will expire in 1 hour.</strong></p>
      </div>
      <p style="color: #666; font-size: 0.9em;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p style="color: #666;">© 2026 UnderTaker | Powered by Monster and bad decisions</p>
    </div>
  </div>
</body>
</html>`;

      await sendEmail({
        to: email,
        subject: '🔑 Reset Your Password',
        htmlBody
      });

      console.log('Password reset email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Continue anyway - token is stored
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If that email is registered, a password reset link has been sent.'
      })
    };

  } catch (error) {
    console.error('Password reset request error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process password reset request. Please try again.'
      })
    };
  }
};
