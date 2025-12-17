# SiteSettings Table - Add to Airtable

## Quick Import (Recommended)

**Just import the CSV file:** `SiteSettings-IMPORT.csv`

1. In Airtable, create a new table or import into existing base
2. Click "Add or import" → "CSV file"
3. Select `SiteSettings-IMPORT.csv`
4. Airtable will automatically detect field types!
5. Review and confirm the import
6. The example row has proper defaults (Maintenance OFF, Tracking ON)

**That's it!** Your settings are ready to use immediately.

## Manual Setup (If Needed)

If you prefer to create fields manually, here are the fields:

## Fields:

1. **Name** (Single line text) - Primary field
   - Just name it "Settings" or "Site Configuration"

2. **MaintenanceMode** (Checkbox)
   - Check to enable maintenance mode
   - Uncheck to allow normal site access

3. **TrackIPEnabled** (Checkbox)
   - Check to enable IP/location tracking
   - Uncheck to disable tracking (privacy mode)

4. **LastUpdated** (Date with time)
   - Automatically updated when settings change

## How to Create:

1. Go to your Airtable base
2. Click "+ Add or import" → "Create new table"
3. Name it: `SiteSettings`
4. Add the fields above
5. Create ONE record with default values:
   - Name: "Site Configuration"
   - MaintenanceMode: Unchecked
   - TrackIPEnabled: Checked

That's it! The toggles will now work instantly without redeployment.
