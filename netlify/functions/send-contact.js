const fetch = require('node-fetch');
const { sendEmail } = require('./utils/send-email');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { name, email, message } = JSON.parse(event.body || '{}');

    if (!name || !email || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name, email, and message are required' }) };
    }

    // Server-side rate limit + VPN soft check
    try {
      const baseUrl = event.headers.origin || process.env.SITE_URL || 'https://mathi4s.com';
      const rateResponse = await fetch(`${baseUrl}/.netlify/functions/check-rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'contact' })
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

    const recipient = process.env.SENDER_EMAIL || 'support@mathi4s.com';
    const subject = `Contact form: ${name} <${email}>`;
    const htmlBody = `
      <h2>New Contact Form Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <hr />
      <p style="white-space: pre-wrap;">${message}</p>
    `;
    const textBody = `New Contact Form Message\n\nName: ${name}\nEmail: ${email}\n\n${message}`;

    await sendEmail({
      to: recipient,
      subject,
      htmlBody,
      textBody
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send contact message' }) };
  }
};
