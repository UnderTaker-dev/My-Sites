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

    // Log the unsubscribe
    // In production, you'd:
    // 1. Remove from active subscribers in database
    // 2. Add to unsubscribed list with timestamp
    // 3. Never send them emails again
    
    console.log('Unsubscribe request:', {
      email: email,
      timestamp: new Date().toISOString(),
      userAgent: event.headers['user-agent']
    });

    // Return success - client-side will handle localStorage removal
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Successfully unsubscribed',
        email: email
      })
    };
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Unsubscribe failed'
      })
    };
  }
};
