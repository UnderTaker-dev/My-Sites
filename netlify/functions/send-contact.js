exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name, email, message } = JSON.parse(event.body);
    
    // Validate input
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'All fields are required' })
      };
    }

    // For now, we'll use a simple webhook service or email API
    // Option 1: Use Netlify Forms (easiest)
    // Option 2: Use SendGrid/Mailgun API
    // Option 3: Use a webhook service like Formspree
    
    // Let's use Formspree as it's free and simple
    const formspreeUrl = process.env.FORMSPREE_ENDPOINT;
    
    if (!formspreeUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Email service not configured' })
      };
    }

    const response = await fetch(formspreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        message,
        _replyto: email,
        _subject: `New message from ${name} via mathi4s.com`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Message sent successfully!' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send message. Please try emailing directly.' })
    };
  }
};
