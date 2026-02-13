const Airtable = require('airtable');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message, stack, url, timestamp, userAgent, email } = JSON.parse(event.body || '{}');
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'message required' }) };
    }

    const clientIp = event.headers['client-ip'] || 
                     event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     'Unknown';

    // Log to Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(process.env.AIRTABLE_BASE_ID);
    
    try {
      await base('ActivityLog').create([{
        fields: {
          Type: 'error_report',
          Timestamp: new Date().toISOString(),
          Note: `Frontend Error: ${message}`,
          'Admin IP': clientIp,
          Email: email || 'Unknown',
          Meta: JSON.stringify({
            stack: stack?.slice(0, 500),
            url,
            userAgent,
            timestamp
          }).slice(0, 1000)
        }
      }]);
    } catch (dbErr) {
      console.error('Failed to log error to Airtable:', dbErr.message);
    }

    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_MENTION_ID) {
      try {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        const mentionId = process.env.DISCORD_MENTION_ID;
        
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `<@&${mentionId}> **CRITICAL ERROR REPORT**`,
            embeds: [{
              color: 0xFF0000,
              title: '🚨 Frontend Error Detected',
              description: message,
              fields: [
                { name: 'URL', value: url || 'Unknown', inline: false },
                { name: 'User Email', value: email || 'Unknown', inline: true },
                { name: 'Client IP', value: clientIp, inline: true },
                { name: 'Stack Trace', value: `\`\`\`\n${stack?.slice(0, 300) || 'N/A'}\n\`\`\``, inline: false },
              ],
              timestamp: new Date().toISOString()
            }]
          })
        });
      } catch (discordErr) {
        console.error('Discord notification failed:', discordErr.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Error reported' })
    };
  } catch (error) {
    console.error('report-error function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to report error' })
    };
  }
};
