# Appeals Table Setup

**Smart single table** that tracks ALL appeal history - see repeat offenders, approval patterns, and full audit trail.

## Quick Import (Recommended)

**Just import the CSV file:** `Appeals-IMPORT.csv`

1. In Airtable, create a new table or import into existing base
2. Click "Add or import" → "CSV file"
3. Select `Appeals-IMPORT.csv`
4. Airtable automatically detects all field types from the data!
5. Review and confirm
6. Delete the example row

**Done!** Airtable reads your actual data and creates proper field types.

## Why One Table?

### See the full picture:
- ✅ **Track repeat appeals** - "This IP appealed 3 times already"
- ✅ **Spot abuse patterns** - "They got approved, then got blocked again 2 weeks later"
- ✅ **Historical record** - Keep all appeals even after resolving
- ✅ **Filter by status** - Pending / Approved / Denied all in one place
- ✅ **Audit trail** - Who reviewed, when, and what they decided

### Better than separate tables:
- ❌ BlockAppeals table = lose history when you delete approved ones
- ❌ Can't see if someone appeals multiple times
- ❌ Can't track if unbanned users misbehave again
- ✅ One Appeals table = complete timeline forever

## Fields Explained

| Field | Type | What it tracks |
|-------|------|----------------|
| **IP** | Single line text | IP requesting unblock |
| **Email** | Email | Contact email (auto-validates) |
| **Reason** | Long text | Their explanation |
| **Status** | Single select | Pending / Approved / Denied |
| **SubmittedDate** | Date | When they appealed |
| **ReviewedDate** | Date | When you reviewed it |
| **ReviewedBy** | Single line text | Your name/email |
| **AdminNotes** | Long text | Why you approved/denied |
| **UnblockedDate** | Date | When you removed them from BlockedIPs |
| **TimesAppealed** | Number | Auto-counts: 1st, 2nd, 3rd appeal |
| **PreviousStatus** | Single line text | What happened last time they appealed |
| **UserAgent** | Single line text | Browser/device info |

## How to Use

### When someone appeals:
1. They submit from `blocked.html`
2. New row in Appeals table with Status = "Pending"
3. **TimesAppealed** auto-counts their previous appeals
4. **PreviousStatus** shows if they've been here before
5. You get Discord @mention

### Reviewing appeals:

**First-time appealer:**
```
IP: 192.168.1.100
Email: john@example.com
Reason: I was trying to subscribe...
Status: Pending
TimesAppealed: 1
PreviousStatus: (empty)
```
→ Likely legitimate, approve!

**Repeat appealer:**
```
IP: 192.168.1.100
Email: john@example.com  
Reason: Please unblock me again...
Status: Pending
TimesAppealed: 3
PreviousStatus: Approved
```
→ Hmm, they got approved before. Check BlockedIPs to see why they're blocked AGAIN. Might be abusing the system.

### To approve:
1. Change **Status** to "Approved"
2. Fill **ReviewedDate** (today)
3. Fill **ReviewedBy** (your name)
4. Fill **AdminNotes** ("Seems legitimate, first offense")
5. Fill **UnblockedDate** (today)
6. **Go to BlockedIPs table** → DELETE their IP row
7. They can now access site!

### To deny:
1. Change **Status** to "Denied"
2. Fill **ReviewedDate** (today)
3. Fill **ReviewedBy** (your name)
4. Fill **AdminNotes** ("Obvious spam bot, keeping blocked")
5. Keep their IP in BlockedIPs table
6. They stay blocked

## Pro Tips

### Filter views:
- **Pending Appeals** → Filter: Status = "Pending"
- **Repeat Offenders** → Filter: TimesAppealed ≥ 2
- **Recently Approved** → Filter: Status = "Approved", ReviewedDate is within last 30 days
- **Denied History** → Filter: Status = "Denied"

### Red flags:
- 🚩 TimesAppealed = 3+ → Suspicious
- 🚩 PreviousStatus = "Approved" but blocked again → Pattern of abuse
- 🚩 Generic reasons → "unblock me please" (no explanation)
- 🚩 Same IP, different emails → Trying to look different

### Green flags:
- ✅ TimesAppealed = 1 → First time, probably legit
- ✅ Detailed explanation → Sounds like real person
- ✅ AutoBlocked = true in BlockedIPs → Likely false positive
- ✅ Real email domain → @gmail.com, not @temporarymail.com

## Example Scenarios

**Scenario 1: False positive**
```
User got auto-blocked for typing too fast (spam pattern).
TimesAppealed: 1
PreviousStatus: (empty)
Reason: Detailed, makes sense
→ Approve! Remove from BlockedIPs.
```

**Scenario 2: Repeat troublemaker**
```
Same IP appealed 6 months ago, was approved.
Now blocked again for spam.
TimesAppealed: 2
PreviousStatus: Approved
→ Deny! They had a second chance already.
```

**Scenario 3: Learning from history**
```
Filter for all "Approved" appeals.
See which ones got blocked again.
Adjust your approval criteria!
```

## Discord Integration

When appeal submitted, Discord notification shows:
```
@YourName 🔓 IP Block Appeal Request

IP: 192.168.1.100
Email: user@example.com
Times Appealed: 2 (Previously: Approved)
Reason: [their explanation]
```

**"Times Appealed: 2"** tells you immediately this isn't their first rodeo!

## Never Lose History

Unlike separate tables, this approach:
- ✅ Keeps all appeals forever
- ✅ Shows patterns over months/years
- ✅ Proves you handle appeals fairly (audit trail)
- ✅ Helps you learn which blocks are false positives
- ✅ Identifies IPs that keep causing trouble

---

**Questions?** Check the Appeals-IMPORT.csv example for proper data format.
