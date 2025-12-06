# Newsletter Setup with Microsoft 365

## What's Configured

Your website now has a fully functional newsletter system integrated with your Microsoft 365 email (support@mathi4s.com).

## Features

✅ Newsletter signup form on homepage
✅ Admin panel to manage subscribers
✅ Send newsletters via Microsoft Graph API
✅ Export subscribers to CSV
✅ HTML email support

## Environment Variables Needed in Netlify

Add these to your Netlify dashboard (Site Settings → Environment Variables):

### For Admin Login
- `ADMIN_USERNAME` - Your admin username (default: UndeTaker)
- `ADMIN_PASSWORD` - Your secure password (default: changeme123)

### For Microsoft Graph API (Email Sending)
Add these exact values to Netlify:

1. `MICROSOFT_CLIENT_ID` = `6963a3d3-de15-4913-9665-2c574ca57123`
2. `MICROSOFT_CLIENT_SECRET` = (You need to create this - see below)
3. `MICROSOFT_TENANT_ID` = `889b1611-6e1b-45d6-8ee9-dab0652235cf`
4. `SENDER_EMAIL` = `support@mathi4s.com`

## How to Get Microsoft Graph Credentials

**Client ID and Tenant ID are already filled above!** ✅

**You only need to create the Client Secret:**

1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App Registrations**
3. Click on **Mathi4s Email Sender**
4. Go to **Certificates & secrets** (left menu)
5. Click **+ New client secret**
6. Description: "Netlify Email Sender"
7. Expires: Choose your preference (24 months recommended)
8. Click **Add**
9. **IMMEDIATELY COPY THE SECRET VALUE** (you can't see it again!) → This is `MICROSOFT_CLIENT_SECRET`
10. Add it to Netlify environment variables

## How to Use

### Send a Newsletter

1. Type Konami code on homepage: ↑ ↑ ↓ ↓ ← → ← → B A
2. Login with your admin credentials
3. Click "✉️ Send Newsletter" button
4. Write your subject and message (HTML supported)
5. Click "📨 Send to All"

### Email HTML Example

```html
<h2>🚀 New Update!</h2>
<p>Hey there!</p>
<p>Just wanted to let you know about something cool...</p>
<p><a href="https://mathi4s.com" style="background: #1abc9c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Check it out!</a></p>
<p>- Mathias</p>
```

## Current Setup

- Subscribers are stored in browser localStorage
- When you send a newsletter, it reads from localStorage
- Emails are sent via Microsoft Graph API using your Microsoft 365 account
- All sent emails appear in your "Sent Items" folder

## Future Improvements (Optional)

- Store subscribers in a database (Airtable, Supabase, MongoDB)
- Add unsubscribe links
- Schedule newsletters
- Track open rates
- Add email templates

## Testing

Before going live, test with a few email addresses (including your own) to make sure everything works!
