exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid email address'
        })
      };
    }

    // TODO: Store in database (for now, just return success)
    // In the future, you can integrate with:
    // - Airtable
    // - Google Sheets
    // - MongoDB
    // - PostgreSQL via Supabase
    
    console.log('New subscriber:', email);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Subscription successful',
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
