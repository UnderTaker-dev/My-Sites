# Admin Notification System 🔔

## Overview

The admin dashboard now has a fully functional notification system that sends you emails when important events happen on your website.

## How It Works

### Notification Types

1. **New Subscriber** 📧
   - Triggers when someone subscribes to your newsletter
   - Shows subscriber's email and timestamp
   
2. **New Donation** 💰
   - Triggers when someone makes a donation
   - Shows amount, currency, and donor email (if provided)

### Email Delivery

Notifications are sent using Microsoft Graph API (same service used for newsletters). The system:
- Sends to the email address specified in `ADMIN_EMAIL` environment variable
- Falls back to `support@mathi4s.com` if not set
- Saves sent emails to your "Sent Items" folder
- Includes beautifully formatted HTML emails

## Setup Requirements

### Environment Variables

Add these to your Netlify site settings:

```
ADMIN_EMAIL=your@email.com          # Where notifications are sent
MICROSOFT_CLIENT_ID=xxx             # Already configured for newsletters
MICROSOFT_CLIENT_SECRET=xxx         # Already configured for newsletters  
MICROSOFT_TENANT_ID=xxx             # Already configured for newsletters
SENDER_EMAIL=support@mathi4s.com    # Already configured for newsletters
```

### Admin Dashboard Settings

In the **Settings** tab → **Notifications** section:

- ✅ **Email me when someone subscribes** - Currently saved locally (UI preference)
- ✅ **Email me when someone donates** - Currently saved locally (UI preference)

**Note:** The checkboxes save your preference locally but notifications are **always sent** if the Microsoft Graph credentials are configured. To disable notifications completely, remove the `ADMIN_EMAIL` environment variable in Netlify.

## How Notifications Are Triggered

### Subscriber Notifications
- Triggered by: `newsletter-subscribe.js` function
- When: After successfully adding email to Airtable
- Calls: `notify-admin.js` with type `new_subscriber`

### Donation Notifications
- Triggered by: `stripe-webhook.js` function  
- When: After Stripe confirms payment and saves to Airtable
- Calls: `notify-admin.js` with type `new_donation`

## Email Templates

### New Subscriber Email
```
Subject: 🎉 New Newsletter Subscriber!

Someone just subscribed to your newsletter:
[Email Address]
Time: [Timestamp]
```

### New Donation Email
```
Subject: 💰 New Donation Received!

You received a new donation:
Amount: [Currency] [Amount]
From: [Email or Anonymous]
Time: [Timestamp]
```

## Testing

1. Subscribe to newsletter on homepage
2. Check your email (ADMIN_EMAIL)
3. Make a test donation ($1 minimum)
4. Check your email again

## Troubleshooting

### Not receiving notifications?

1. Check Netlify environment variables are set:
   - `ADMIN_EMAIL`
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_TENANT_ID`

2. Check Netlify function logs:
   - Go to Netlify dashboard
   - Functions → `notify-admin`
   - Check for errors

3. Verify Microsoft Graph permissions:
   - Same permissions used for newsletters
   - Should already be working

### Notification sent but not received?

- Check spam folder
- Verify `ADMIN_EMAIL` is correct
- Check "Sent Items" in Microsoft 365

## Future Enhancements

Possible improvements:
- Toggle notifications on/off from admin panel (currently requires env var changes)
- Email templates customization
- Digest emails (daily summary instead of immediate)
- SMS notifications via Twilio
- Slack/Discord webhook integration
- Custom notification rules (e.g., only notify for donations over $X)

## Technical Details

**Files involved:**
- `/netlify/functions/notify-admin.js` - Main notification handler
- `/netlify/functions/newsletter-subscribe.js` - Triggers subscriber notifications
- `/netlify/functions/stripe-webhook.js` - Triggers donation notifications
- `/admin-tabs.html` - Settings UI (localStorage only)

**Flow:**
1. Event happens (subscription/donation)
2. Main function processes event
3. Saves to Airtable
4. Calls `notify-admin` function (non-blocking)
5. Gets Microsoft Graph access token
6. Sends formatted email
7. Logs result

**Error Handling:**
- Notifications fail silently (don't break main functions)
- Errors logged to Netlify function logs
- Returns success even if email service not configured
