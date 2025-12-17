# Discord Webhook Setup Guide

Get instant notifications in Discord for important events on your website.

## Step 1: Create Discord Webhook

1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it something like "Website Notifications"
5. Choose the channel where notifications should appear
6. Click "Copy Webhook URL"

## Step 2: Add to Netlify

1. Go to your Netlify dashboard
2. Open your site → Site settings → Environment variables
3. Click "Add a variable"
4. Add these two variables:

**Variable 1:**
- Key: `DISCORD_WEBHOOK_URL`
- Value: Paste the webhook URL you copied
- Scopes: All (leave checked)

**Variable 2 (Optional - for @mentions):**
- Key: `DISCORD_MENTION_ID`
- Value: Your Discord user ID or role ID
- Scopes: All (leave checked)

### How to get your Discord ID:
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your name → Copy ID
3. Paste this ID as DISCORD_MENTION_ID

**Note:** If you don't add DISCORD_MENTION_ID, notifications will still work but won't @mention anyone.

## Step 3: Deploy

After adding environment variables:
1. Go to Deploys tab
2. Click "Trigger deploy" → "Deploy site"
3. Wait for deployment to finish

## What You'll Get Notified About

### 📧 New Subscriber (Blue)
- Someone subscribes to newsletter
- Shows email and source

### 💚 New Donation (Green)
- Someone makes a donation
- **Auto @mentions you** if donation is $10 or more
- Shows amount and donor name

### 📊 Traffic Spike (Orange)
- Unusual traffic detected
- Shows visitor count

### 🚨 Error Alert (Red)
- Critical system error
- **Always @mentions you**
- Shows error details

### 🚫 IP Blocked (Dark Red)
- Someone got automatically blocked
- Shows IP and reason
- Check if it's a false positive

### 🔓 Block Appeal (Orange)
- Blocked user requested unblock
- **Always @mentions you**
- Shows their IP, email, and reason
- Review and decide to approve/deny

## Notification Examples

**New Subscriber:**
```
📧 New Subscriber
Email: john@example.com
Source: Website
```

**Big Donation:**
```
@YourName 💰 New Donation - $25.00
Donor: Jane Smith
Message: Keep up the great work!
```

**Block Appeal:**
```
@YourName 🔓 IP Block Appeal Request
IP: 192.168.1.100
Email: help@example.com
Reason: I was trying to subscribe but got blocked. Please help!
```

## Testing

After setup, test by:
1. Subscribe to your newsletter → Should get blue notification
2. Submit a block appeal → Should get orange notification with @mention

## Troubleshooting

**No notifications appearing?**
- Check DISCORD_WEBHOOK_URL is correct in Netlify
- Verify webhook is active in Discord server settings
- Check the channel webhook is assigned to

**@mentions not working?**
- Make sure DISCORD_MENTION_ID is set in Netlify
- Verify it's your user ID (not username)
- Format should be just numbers: `123456789012345678`

**Webhook deleted in Discord?**
- Create a new webhook
- Update DISCORD_WEBHOOK_URL in Netlify
- Redeploy site

## Pro Tips

- Create a dedicated #website-alerts channel for notifications
- Add DISCORD_MENTION_ID as a role ID to ping multiple admins
- Check notifications regularly for block appeals (users are waiting!)
- Big donations ($10+) auto-mention you so you can thank them personally
