# Missing Airtable Tables Setup

The following tables need to be created in your Airtable base. These tables are referenced by the new admin features.

## Tables to Create:

### 1. **Settings** (for theme & visibility toggles)
Fields:
- `Theme` (Single line text) - Values: "default", "christmas", "halloween", "valentine", "newyear", "easter"
- `Support Me Visible` (Checkbox) - Default: checked

### 2. **ActivityLog** (for audit trail)
Fields:
- `Type` (Single line text) - Action type (resend_confirmation, force_confirm, delete, etc)
- `Email` (Email) - Subscriber email
- `Note` (Single line text) - Admin notes
- `Meta` (Long text) - JSON metadata
- `Admin Email` (Email) - Who performed the action
- `Admin Name` (Single line text) - Admin name
- `Admin IP` (Single line text) - Client IP address
- `Timestamp` (Created time) - Auto timestamp

### 3. **EmailQueue** (for failed email retry)
Fields:
- `Email` (Email) - Recipient email
- `Token` (Single line text) - Verification token
- `Status` (Single select: "Failed", "Queued", "Sent") - Email status
- `Error` (Long text) - Error message
- `Retries` (Number) - Retry count
- `Timestamp` (Created time) - When queued

### 4. **AdminUsers** (for access control)
Fields:
- `Email` (Email) - Admin email
- `Name` (Single line text) - Admin name
- `Role` (Single select: "Owner", "Editor", "Viewer") - Admin role
- `Status` (Single select: "Active", "Pending", "Inactive") - Account status
- `Invite Token` (Single line text) - One-time invite token
- `Created` (Created time) - Account creation date
- `Last Access` (Last modified time) - Last login

## How to Create These Tables:

1. Go to your Airtable Base
2. Click **"+ Add a table"** button
3. Name it (e.g., "Settings")
4. Add the fields listed above
5. Set field types as specified
6. Repeat for each table

## Quick Workaround (Until Tables Exist):

The admin dashboard will gracefully handle missing tables - they just won't save/load data. 
Once you create the tables in Airtable with the exact field names listed above, everything will start working!

## Field Names Are Case-Sensitive!

Make sure to use exact field names shown above. For example:
- ✅ `Admin IP` 
- ❌ `admin ip` (will fail)
- ❌ `admin_ip` (will fail)
