const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { type, data, mention } = JSON.parse(event.body);
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('Discord webhook not configured');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, message: 'Discord not configured' })
      };
    }

    let embed;
    let content = ''; // For @mentions

    // Add @mention if requested (mention can be user ID like <@123456789> or role like <@&123456789>)
    if (mention) {
      content = mention;
    }

    switch (type) {
      case 'new_subscriber':
        embed = {
          title: '📬 New Newsletter Subscriber!',
          description: `Someone just subscribed to the newsletter`,
          color: 3447003, // Blue
          fields: [
            { name: 'Email', value: data.email || 'Unknown', inline: true },
            { name: 'Source', value: data.source || 'Homepage', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Newsletter Subscription' }
        };
        break;

      case 'new_donation':
        embed = {
          title: '💰 New Donation Received!',
          description: `Someone just sent support!`,
          color: 2067276, // Green
          fields: [
            { name: 'Amount', value: `$${data.amount || '0'}`, inline: true },
            { name: 'Email', value: data.email || 'Anonymous', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Donation System' }
        };
        // Ping for donations over $10
        if (data.amount && data.amount >= 10 && !mention) {
          content = process.env.DISCORD_MENTION_ID || '';
        }
        break;

      case 'traffic_spike':
        embed = {
          title: '📈 Traffic Spike Alert!',
          description: `High visitor activity detected`,
          color: 15844367, // Orange
          fields: [
            { name: 'Visitors', value: `${data.count || 0} in last hour`, inline: true },
            { name: 'Status', value: 'Monitoring', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Traffic Monitor' }
        };
        break;

      case 'error_alert':
        embed = {
          title: '⚠️ Error Alert!',
          description: data.message || 'An error occurred',
          color: 15158332, // Red
          fields: [
            { name: 'Error Type', value: data.errorType || 'Unknown', inline: true },
            { name: 'Location', value: data.location || 'N/A', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Error Monitoring' }
        };
        // Always ping for errors
        if (!mention) {
          content = process.env.DISCORD_MENTION_ID || '';
        }
        break;

      case 'ip_blocked':
        embed = {
          title: '🚫 IP Blocked',
          description: 'An IP has been automatically blocked',
          color: 10038562, // Dark Red
          fields: [
            { name: 'IP Address', value: data.ip || 'Unknown', inline: true },
            { name: 'Reason', value: data.reason || 'Spam pattern detected', inline: true },
            { name: 'Auto-blocked', value: data.autoBlocked ? 'Yes' : 'No', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Security System' }
        };
        break;

      case 'block_appeal':
        embed = {
          title: '📝 Block/Suspension Appeal Submitted',
          description: data.appealType?.startsWith('Account_') 
            ? 'A suspended account submitted an appeal' 
            : 'Someone requested to unblock their IP',
          color: 15844367, // Orange
          fields: [
            { name: 'Type', value: data.appealType?.replace('_', ' ') || 'IP Block', inline: true },
            { name: 'IP Address', value: data.ip || 'Unknown', inline: true },
            { name: 'Email', value: data.email || 'Not provided', inline: true },
            { name: 'Reason', value: data.reason || 'No reason provided', inline: false }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Appeal System' }
        };
        // Ping for appeals so admin sees it
        if (!mention) {
          content = process.env.DISCORD_MENTION_ID || '';
        }
        break;

      case 'new_user_signup':
        embed = {
          title: '👤 New User Signup',
          description: 'A new user just registered to your site',
          color: 3447003, // Blue
          fields: [
            { name: 'Name', value: data.name || 'Unknown', inline: true },
            { name: 'Email', value: data.email || 'Not provided', inline: true },
            { name: 'Signup Time', value: new Date().toLocaleString(), inline: false }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'User Registration' }
        };
        break;

      case 'deletion_request':
        embed = {
          title: '🗑️ Account Deletion Request',
          description: 'A user has requested account deletion',
          color: 15158332, // Red
          fields: [
            { name: 'Name', value: data.name || 'Unknown', inline: true },
            { name: 'Email', value: data.email || 'Not provided', inline: true },
            { name: 'User ID', value: data.userId || 'N/A', inline: true },
            { name: 'Request Time', value: new Date().toLocaleString(), inline: false },
            { name: 'Action Required', value: 'Review and process deletion in Admin Panel', inline: false }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Account Deletion System' }
        };
        // Ping for deletion requests so admin sees it
        if (!mention) {
          content = process.env.DISCORD_MENTION_ID || '';
        }
        break;

      default:
        embed = {
          title: '🔔 Notification',
          description: data.message || 'New activity',
          color: 7506394, // Purple
          timestamp: new Date().toISOString()
        };
    }

    const payload = {
      content: content || undefined,
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', response.status, errorText);
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    console.log(`Discord notification sent: ${type}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Notification sent' })
    };

  } catch (error) {
    console.error('Discord notification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
