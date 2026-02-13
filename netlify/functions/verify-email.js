const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

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
    const { token } = JSON.parse(event.body || '{}');

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Verification token is required' })
      };
    }

    // Find user by verification token
    const users = await base('Users')
      .select({
        filterByFormula: `{VerificationToken} = '${token}'`,
        maxRecords: 1
      })
      .firstPage();

    if (users.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid verification token' })
      };
    }

    const user = users[0];
    const userFields = user.fields;

    // Check if already verified
    if (userFields.EmailVerified) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Email is already verified'
        })
      };
    }

    // Check if token expired
    const expiryDate = new Date(userFields.VerificationExpiry);
    if (expiryDate < new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Verification link has expired',
          expired: true
        })
      };
    }

    // Update user to verified
    await base('Users').update(user.id, {
      EmailVerified: true,
      VerificationToken: null,
      VerificationExpiry: null
    });

    console.log('Email verified for:', userFields.Email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        email: userFields.Email
      })
    };

  } catch (error) {
    console.error('Email verification error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Verification failed. Please try again.'
      })
    };
  }
};
