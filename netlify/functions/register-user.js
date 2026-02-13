const Airtable = require('airtable');
const { sendEmail } = require('./utils/send-email');
const fetch = require('node-fetch');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Simple hash function (for production, use bcrypt)
async function hashPassword(password) {
  // Using crypto module for hashing
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Generate verification token
function generateVerificationToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check for disposable email domains
const disposableEmailDomains = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
  'mailinator.com', 'trashmail.com', 'fakeinbox.com', 'yopmail.com'
];

function isDisposableEmail(email) {
  const domain = email.split('@')[1].toLowerCase();
  return disposableEmailDomains.includes(domain);
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
    const { name, email, password } = JSON.parse(event.body || '{}');

    // Validation
    if (!name || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name, email, and password are required' })
      };
    }

    if (name.trim().length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name must be at least 2 characters' })
      };
    }

    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' })
      };
    }

    if (isDisposableEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Disposable email addresses are not allowed' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    // Server-side rate limit + VPN soft check
    try {
      const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
      const rateResponse = await fetch(`${baseUrl}/.netlify/functions/check-rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup' })
      });

      const rateData = await rateResponse.json();
      if (!rateData.allowed) {
        return {
          statusCode: rateData.blocked ? 403 : 429,
          headers,
          body: JSON.stringify({
            error: rateData.reason || 'Too many requests. Please try again later.',
            blocked: rateData.blocked || false,
            appealUrl: rateData.appealUrl
          })
        };
      }
    } catch (rateError) {
      // Fail open if rate limit check fails
    }

    // Check if email already exists
    const existingUsers = await base('Users')
      .select({
        filterByFormula: `LOWER({Email}) = '${email.toLowerCase()}'`,
        maxRecords: 1
      })
      .firstPage();

    if (existingUsers.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Email address is already registered' })
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create user record
    const record = await base('Users').create({
      Name: name.trim(),
      Email: email.toLowerCase().trim(),
      PasswordHash: hashedPassword,
      CreatedAt: new Date().toISOString(),
      EmailVerified: false,
      Status: 'Active',
      VerificationToken: verificationToken,
      VerificationExpiry: verificationExpiry
    });

    // Send verification email (don't block registration if this fails)
    try {
      const verificationUrl = `${event.headers.origin || 'https://yourdomain.com'}/verify-email.html?token=${verificationToken}`;
      
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #3498db, #9b59b6); color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; color: #333333; }
    .content p { color: #333333; margin: 10px 0; }
    .content strong { color: #e74c3c; }
    .button { display: inline-block; background: #3498db; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .button:hover { background: #2980b9; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ffffff; margin: 0;">🚀 Welcome to UnderTaker!</h1>
    </div>
    <div class="content">
      <p style="color: #333333;">Hi <strong style="color: #333333;">${name}</strong>,</p>
      <p style="color: #333333;">Thanks for signing up! To complete your registration and verify your email address, please click the button below:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${verificationUrl}" class="button" style="color: #ffffff;">Verify Email Address</a>
      </div>
      <p style="color: #e74c3c; font-weight: 600;">⏱️ This link will expire in 24 hours.</p>
      <p style="color: #666; font-size: 0.9em;">If you didn't create this account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p style="color: #666;">© 2026 UnderTaker | Powered by Monster and bad decisions</p>
    </div>
  </div>
</body>
</html>`;

      await sendEmail({
        to: email,
        subject: '✉️ Verify your email address',
        htmlBody
      });

      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email sending fails
    }

    console.log('New user registered:', email);

    // Send Discord notification
    try {
      const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
      await fetch(`${baseUrl}/.netlify/functions/send-discord-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_user_signup',
          data: { name, email }
        })
      });
    } catch (discordError) {
      console.error('Failed to send Discord notification:', discordError);
      // Don't fail registration if Discord notification fails
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account created successfully! Please check your email to verify your account.',
        userId: record.id
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Registration failed. Please try again.'
      })
    };
  }
};
