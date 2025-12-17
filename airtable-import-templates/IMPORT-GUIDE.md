# Quick Airtable Import Guide

Super easy! Just drag and drop these 3 CSV files into Airtable.

## Import Steps (Takes 2 Minutes)

### 1. SiteSettings Table
**File:** `SiteSettings-IMPORT.csv`

1. Open your Airtable base
2. Click "Add or import" → "CSV file"
3. Drop `SiteSettings-IMPORT.csv`
4. Airtable detects: Text, Checkboxes, Date ✓
5. Confirm → Done!

**What it does:**
- MaintenanceMode (OFF by default) - Toggle site maintenance
- TrackIPEnabled (ON by default) - Toggle IP tracking
- Changes take effect instantly, no redeploy needed!

---

### 2. BlockedIPs Table
**File:** `BlockedIPs-IMPORT.csv`

1. Click "Add or import" → "CSV file"
2. Drop `BlockedIPs-IMPORT.csv`
3. Airtable detects: Text, Long text, Date, Checkbox ✓
4. Confirm → Delete example row → Done!

**What it does:**
- Stores blocked spam IPs
- AutoBlocked = TRUE if system blocked it
- AutoBlocked = FALSE if you manually added it

---

### 3. Appeals Table
**File:** `Appeals-IMPORT.csv`

1. Click "Add or import" → "CSV file"
2. Drop `Appeals-IMPORT.csv`
3. Airtable detects: Text, Email, Long text, Date, Number, Select ✓
4. Confirm → Delete example row → Done!

**What it does:**
- Stores ALL appeal history (pending, approved, denied)
- Tracks repeat appeals from same IP
- Shows if previously-approved users got blocked again
- Full audit trail forever
- You get @mentioned on Discord when someone appeals

---

## Field Types Breakdown

### SiteSettings-IMPORT.csv
```
Name → Single line text
MaintenanceMode → Checkbox (TRUE/FALSE)
TrackIPEnabled → Checkbox (TRUE/FALSE)
LastUpdated → Date
```

### BlockedIPs-IMPORT.csv
```
IP → Single line text
Reason → Long text
BlockedDate → Date
AutoBlocked → Checkbox (TRUE/FALSE)
Notes → Long text
```

### Appeals-IMPORT.csv
```
IP → Single line text
Email → Email (validates format)
Reason → Long text
Status → Single select (Pending/Approved/Denied)
SubmittedDate → Date
ReviewedDate → Date
ReviewedBy → Single line text
AdminNotes → Long text
UnblockedDate → Date
TimesAppealed → Number (auto-counts)
PreviousStatus → Single line text (shows last appeal result)
UserAgent → Single line text
```your data**
- Row 1 = Field names
- Row 2+ = Real example data
- Airtable looks at the data and infers types automatically!
- No manual field type configuration needed
✅ **Airtable automatically detects field types from row 2**
- Row 1 = Field names
- Row 2 = Field types (Airtable reads this!)
- Row 3+ = Example data (delete after import)

✅ **Chlowercase `true` or `false` in CSV
- Airtable auto-converts to checkbox typeo checkbox
- Case doesn't matter

✅ **Single Select (Status field):**
- Airtable creates options from your data
- After import, you can add more options in field settings
- For BlockAppeals: Pending, Approved, Denied

✅ **Dates:**
- Format: YYYY-MM-DD works best
- Airtable converts to its date format

## After Import Checklist

1. ✓ Delete example rows (or keep for reference)
2. ✓ Verify field types look correct
3. ✓ Check SiteSettings has 1 row (Maintenance OFF, Tracking ON)
4. ✓ BlockedIPs and Appeals start with 1 example row each
5. ✓ Delete example rows or keep for reference
6. ✓ Test by visiting site-settings.html to toggle maintenance mode

## Troubleshooting

**Field type detected wrong?**
- After import, click field name → "Customize field type"
- Change to correct type

**Status dropdown missing options?**
- Click Status field → Field settings
- Add: Pending, Approved, Denied

**Import failed?**
- Make sure CSV files aren't open in Excel
- Try copying to a new location first
- Check file encoding is UTF-8

---

**That's it!** Your Airtable tables are ready. Now add the Discord webhook and you're done! 🎉
