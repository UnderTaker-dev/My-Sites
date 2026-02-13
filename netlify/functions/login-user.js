const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Verify password hash
async function verifyPassword(password, storedHash) {
  const crypto = require('crypto');
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Generate simple auth token
function generateToken(userId, email) {
  const crypto = require('crypto');
  const payload = JSON.stringify({
    userId,
    email,
    timestamp: Date.now(),
    random: crypto.randomBytes(16).toString('hex')
  });
  return Buffer.from(payload).toString('base64');
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
    const { email, password } = JSON.parse(event.body || '{}');

    // Validation
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
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
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    const user = users[0];
    const userFields = user.fields;

    // Check account status
    if (userFields.Status && userFields.Status !== 'Active') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Account is suspended or inactive' })
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, userFields.PasswordHash);
    
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    // Update last login
    await base('Users').update(user.id, {
      LastLogin: new Date().toISOString()
    });

    // Generate auth token
    const token = generateToken(user.id, userFields.Email);

    console.log('User logged in:', email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        userId: user.id,
        name: userFields.Name,
        email: userFields.Email,
        emailVerified: userFields.EmailVerified || false
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Login failed. Please try again.'
      })
    };
  }
};
