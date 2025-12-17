# BlockedIPs Table - Add to Airtable

## Quick Import (Recommended)

**Just import the CSV file:** `BlockedIPs-IMPORT.csv`

1. In Airtable, create a new table or import into existing base
2. Click "Add or import" → "CSV file"
3. Select `BlockedIPs-IMPORT.csv`
4. Airtable will automatically detect field types!
5. Review and confirm the import
6. Delete the example row (or keep it for reference)

**That's it!** Ready to block spam IPs.

## Manual Setup (If Needed)

If you prefer to create fields manually, here are the fields:

## Fields:

1. **IP** (Single line text) - Primary field
   - The IP address to block

2. **Reason** (Long text)
   - Why this IP was blocked (e.g., "Spam submissions", "Bot activity")

3. **BlockedDate** (Date with time)
   - When the IP was blocked

4. **AutoBlocked** (Checkbox)
   - Check if automatically blocked by system
   - Uncheck if manually blocked by admin

5. **Notes** (Long text) - Optional
   - Additional information about this IP

## How to Create:

1. Go to your Airtable base
2. Click "+ Add or import" → "Create new table"
3. Name it: `BlockedIPs`
4. Add the fields above
5. Start with 0 records - IPs will be added automatically or manually by admin

## Manual Blocking:

To manually block an IP:
1. Add a new record
2. IP: `123.456.789.0`
3. Reason: "Spam activity"
4. BlockedDate: Today
5. AutoBlocked: Unchecked
6. Notes: Any additional details

That IP will be immediately blocked from all form submissions!
