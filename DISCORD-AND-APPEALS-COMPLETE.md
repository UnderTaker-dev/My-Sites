# Discord Notifications & IP Appeal System - Complete Setup

## ✅ What's Been Built

### 1. Discord Webhook Notifications System
**File:** `netlify/functions/send-discord-notification.js`

A comprehensive Discord notification system that sends rich embedded messages for all important events:

**Notification Types:**
- 📧 **New Subscriber** (Blue) - When someone joins newsletter
- 💚 **New Donation** (Green) - When someone donates (auto @mentions for $10+)
- 📊 **Traffic Spike** (Orange) - Unusual visitor activity detected
- 🚨 **Error Alert** (Red) - Critical system errors (always @mentions)
- 🚫 **IP Blocked** (Dark Red) - Automatic spam blocking
- 🔓 **Block Appeal** (Orange) - Blocked user requests unblock (always @mentions)

**Features:**
- Rich embed formatting with colors, fields, timestamps
- Conditional @mentions based on importance
- Non-blocking (won't break site if Discord is down)
- Detailed information for each event type

### 2. IP Block Appeal System
**Files:** 
- `netlify/functions/submit-block-appeal.js` - Backend handler
- `blocked.html` - Beautiful appeal form page

**How it works:**
1. Blocked user tries to access site/subscribe
2. Automatically redirected to `blocked.html` page
3. Shows them why they were blocked
4. Provides appeal form (email + explanation)
3. Submits appeal to Airtable Appeals table
4. **System auto-counts** how many times this IP has appealed
5. Shows their previous appeal status if any
6. Sends Discord notification with @mention to admin
7. Admin reviews and approves/denies in Airtable

**Features:**
- Beautiful, professional design
- Auto-detects and displays user's IP
- Shows block reason from database
- Real-time validation
- Success/error toast notifications
- Admin gets @mentioned on Discord immediately

### 3. Integration with Existing Systems
**Modified:** `netlify/functions/newsletter-subscribe.js`
- Now sends Discord notification when someone subscribes
- Shows subscriber email and source

**Modified:** `netlify/functions/check-rate-limit.js`
- Returns `appealUrl` when IP is blocked
- Frontend redirects blocked users to appeal page

**Modified:** `index.html`
- Checks for blocked IP status
- Auto-redirects to appeal page with reason

## 🎯 What You Can Do Now

### As a Website Owner:
✅ **Get instant Discord alerts** for:
- Every newsletter subscription (no more checking Airtable!)
- Every donation (especially big ones - $10+ auto-mentions you)
- Traffic spikes (know when something goes viral)
- System errors (fix issues immediately)
- Spam blocks (verify they're real threats)
- Appeal requests (help real users who got blocked)

✅ **System shows if they've appealed before** (TimesAppealed field)
- **See their previous appeal status** (were they approved before?)
- You get @mentioned on Discord instantly
- Review in Airtable Appeals table with full history
- If legitimate: Delete from BlockedIPs → User can access
- If spam or repeat offender: Mark as denied with admin notes
- **Never lose history** - track patterns over time
- If legitimate: Delete from BlockedIPs → User can access
- If spam: Mark as denied with admin notes

### As a Blocked User:
✅ **Clear path to resolution**:
- See exactly why they were blocked
- Submit appeal with contact info
- Get confirmation it was received
- Admin reviews and responds quickly

## 📋 Setup Required

### Step 1: Create Discord Webhook
1. Discord Server → Settings → Integrations → Webhooks
2. Create new webhook named "Website Notifications"
3. Choose notification channel
4. Copy webhook URL

### Step 2: Add Environment Variables to Netlify
Go to Netlify: Site Settings → Environment Variables

**Required:**
```
DISCORD_WEBHOOK_URL = <your webhook URL>
```

**Optional (for @mentions):**
```
DISCORD_MENTION_ID = <your Discord user ID>
```

To get Discord ID:
- Enable Developer Mode in Discord settings
- Right-click your name → Copy ID
- Paste as DISCORD_MENTION_ID value

### Step 3: Create Airtable Table
**Table Name:** `Appeals` (tracks ALL history - approved, denied, repeat appeals)

**Quick Import:** Use `Appeals-IMPORT.csv` file!

**Key Fields:**
| Field Name | Type | Why It Matters |
|------------|------|----------------|
| IP | Single line text | User's IP address |
| Email | Email | Contact email |
| Reason | Long text | Why they want unblock |
| Status | Single select | Pending/Approved/Denied |
| **TimesAppealed** | Number | **Auto-counts: See repeat offenders!** |
| **PreviousStatus** | Text | **Shows if they were approved before** |
| SubmittedDate | Date | When submitted |
| ReviewedDate | Date | When you reviewed |
| ReviewedBy | Text | Your name |
| UnblockedDate | Date | When removed from BlockedIPs |
| AdminNotes | Long text | Your decision notes |
| UserAgent | Single line text | Browser info |

### Step 4: Deploy
1. Commit all changes to GitHub
2. Netlify auto-deploys
3. Test by subscribing to newsletter
4. Check Discord for notification!

## 🧪 Testing Guide

### Test Discord Notifications:
1. **Newsletter**: Subscribe on website → Check Discord for blue notification
2. **Block Appeal**: Add your IP to BlockedIPs → Try subscribing → Should redirect to blocked.html → Submit appeal → Check Discord for orange notification with @mention

### Test Appeal System:
1. Add test IP to BlockedIPs table in Airtable
2. Use VPN or mobile to access from that IP
3. Try to subscribe to newsletter
4. Should auto-redirect to blocked.html
5. Submit appeal with test email
6. Check Discord for @mention notification
7. Check Airtable BlockAppeals table for new record
8. Delete IP from BlockedIPs to "approve" appeal
9. Try subscribing again - should work now!

## 📊 Example Discord Messages

**New Subscriber:**
```
📧 New Newsletter Subscriber

Email: john.doe@example.com
Source: Website

December 18, 2024, 3:45 PM
```

**Big Donation (with @mention):**
```
@YourName

💰 New Donation - $25.00

Donor: Jane Smith
Email: jane@example.com
Message: Love your content!

December 18, 2024, 3:50 PM
```

**Block Appeal (with @mention):**
```
@YourName

🔓 IP Block Appeal Request

IP: 192.168.1.100
Email: help@example.com
Reason: I was trying to subscribe to your newsletter but got blocked. I'm not a bot, just a regular visitor. Please help!

December 18, 2024, 4:00 PM
```

## 🔧 How to Handle Appeals

### When you get an appeal notification:

1. ****Check TimesAppealed** - is this 1st or 5th time?
   - **Check PreviousStatus** - were they approved before and caused trouble again?
   - Check the details**:
   - Look at their IP address
   - Read their explanation
   - Check BlockedIPs table for why they were blocked

2. **Decide**:
   - **Automatic block + reasonable explanation** → Probably approve
   - **Manual block (you added it)** → Review carefully
   - **Obvious spam/bot** → Deny

3. **Approve**:
   - Open BlockedIPs table in Airtable
   - FinAppeals table: Change Status to "Approved"
   - Fill in ReviewedDate, ReviewedBy, UnblockedDate, AdminNotes

4. **Deny**:
   - Keep their IP in BlockedIPs (stays blocked)
   - In Appeals table: Change Status to "Denied"
   - Fill in ReviewedDate, ReviewedBy, AdminNotes explaining why
   - They'll remain blocked
   - **Benefit**: Full history shows they appealed and why you denie: Change Status to "Denied"
   - Fill in AdminNotes explaining why
   - They'll remain blocked
**TimesAppealed = 1** → Probably legitimate, first offense
- **TimesAppealed ≥ 3** → Red flag! Check if they keep causing trouble
- **PreviousStatus = "Approved"** + blocked again → Pattern of abuse
- Automatic blocks (spam patterns) are more likely false positives
- Manual blocks (you added) should have clear reasons
- If unsure, approve and watch for bad behavior
- **Never delete appeals** - keep full audit trail forever) are more likely false positives
- Manual blocks (you added) should have clear reasons
- If unsure, approve and watch for bad behavior
- Keep denied appeals for records
- Be nice in AdminNotes - users might see them eventually

## 🚨 Troubleshooting

### Discord notifications not appearing?
- Check DISCORD_WEBHOOK_URL is correct in Netlify
- Verify webhook exists in Discord server
- Check webhook channel permissions
- Redeploy site after adding env variables

### @mentions not working?
- DISCORD_MENTION_ID must be just numbers
- Enable Developer Mode in Discord to copy ID
- Format: `123456789012345678` (no < > or @)
- Can be user ID or role ID

### Blocked users not seeing appeal page?
- Check BlockedIPs table has their IP
- Verify blocked.html file exists in root
- Check browser console for redirect errors
- Test rate limit check function directly

### Appeal submissions not saving?
- Check BlockAppeals table exists in Airtable
- Verify table name spelling matches exactly
- Check Airtable API key has write permissions
- Look at Netlify function logs for errors

## 📈 Next Steps

With Discord notifications working, you can now:
1. ✅ Get real-time alerts for everything important
2. ✅ Respond to block appeals quickly
3. ✅ Thank big donors personally
4. ✅ Monitor traffic spikes
5. ✅ Fix errors immediately

**Future enhancements:**
- Add more notification types (contact form, donations)
- Traffic spike detection in track-page-view.js
- Auto-approve appeals from trusted IPs
- Email notifications as backup to Discord
- Admin dashboard to manage appeals

---

**Questions?** Check DISCORD-SETUP.md for detailed webhook setup instructions, or BlockAppeals-SETUP.md for appeal workflow details.
