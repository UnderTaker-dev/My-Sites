# Airtable Database Setup Complete! 🎉

## Environment Variables for Netlify

Add these to your Netlify site settings (Site settings → Environment variables):

```
AIRTABLE_TOKEN=your_airtable_personal_access_token_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
```

## Existing Environment Variables (keep these):

```
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
ADMIN_EMAIL=your_email@domain.com (where notification emails are sent)
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_microsoft_tenant_id
SENDER_EMAIL=your_sender_email
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## What Changed:

### New Serverless Functions:
- `db-get-subscribers.js` - Fetch all subscribers from Airtable
- `db-add-subscriber.js` - Add new subscriber
- `db-delete-subscriber.js` - Delete subscriber
- `db-get-tech-stack.js` - Get tech stack items
- `db-save-tech-stack.js` - Save tech stack
- `db-add-unsubscribed.js` - Add to unsubscribed list
- `db-get-unsubscribed.js` - Get unsubscribed users

### Updated Functions:
- `newsletter-subscribe.js` - Now saves to Airtable instead of logging
- `unsubscribe.js` - Now updates Airtable tables

## Next Steps:

1. **Update Admin Panel** to use new API endpoints
2. **Update Main Page** to load tech stack from Airtable
3. **Commit all changes** to Git
4. **Push to GitHub** (Netlify auto-deploys)
5. **Add environment variables** in Netlify dashboard
6. **Test all features**

## Airtable Tables:

✅ **Subscribers**: Email, Subscribed Date, Source, IP Address, Status, Notes, Verification Token, Confirmed Date
✅ **Unsubscribed**: Email, Date  
✅ **TechStack**: Icon, Name, Order

### Important: New Fields Required

Please add these fields to your Airtable **Subscribers** table:
- **Verification Token** (Single line text) - For email confirmation
- **Confirmed Date** (Date) - When user confirmed subscription
- **Status** (Single select: "Active", "Pending") - Subscription status

Without these fields, double opt-in won't work properly!
