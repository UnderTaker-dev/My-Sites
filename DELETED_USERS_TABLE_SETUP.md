# DeletedUsers Table Setup Guide

## Overview
The `DeletedUsers` table stores archived user data when accounts are deleted (either by admin or user request). This preserves a complete audit trail instead of permanently deleting user information.

## Required Table: DeletedUsers

### Table Fields

Create a new table in Airtable called **`DeletedUsers`** with these fields:

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| `OriginalUserId` | Single line text | The original Airtable record ID from the Users table |
| `Name` | Single line text | User's name |
| `Email` | Email | User's email address |
| `Status` | Single line text | User status at time of deletion (Active, Suspended, etc.) |
| `EmailVerified` | Checkbox | Whether email was verified |
| `CreatedAt` | Date | When the user account was originally created |
| `DeletedAt` | Date | When the account was deleted |
| `DeletedBy` | Single line text | Who deleted it: "Admin" or "User Request" |
| `DeletionRequested` | Checkbox | Whether user requested deletion themselves |
| `DeletionRequestedAt` | Date | When user requested deletion (if applicable) |
| `LastLogin` | Date | User's last login timestamp |
| `OriginalData` | Long text | Complete JSON backup of all original user fields |

### Field Configuration Details

**OriginalUserId** (Single line text)
- Purpose: Store the original Airtable record ID so you can cross-reference or restore if needed

**CreatedAt** (Date)
- Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Include time: Yes

**DeletedAt** (Date)
- Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Include time: Yes

**DeletionRequestedAt** (Date)
- Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Include time: Yes

**OriginalData** (Long text)
- This field stores a complete JSON string of all user fields for historical reference
- Example format:
```json
{
  "Name": "John Doe",
  "Email": "john@example.com",
  "Status": "Active",
  "EmailVerified": true,
  "CreatedAt": "2025-01-15T10:30:00.000Z",
  "LastLogin": "2025-02-13T14:22:00.000Z"
}
```

## Setup Steps

1. Open your Airtable base
2. Click **"Add or import"** → **"Create new table"**
3. Name it: **DeletedUsers**
4. Add each field listed above with the specified types
5. Save the table

## Usage

Once created, the following features will work:
- ✅ Admin "Delete User" button (moves user to DeletedUsers)
- ✅ "Deleted Users" tab in admin dashboard (displays archived users)
- ✅ Complete audit trail of all deletions
- ✅ Original data preserved for compliance/recovery

## Verification

After creating the table, test by:
1. Going to Admin Dashboard → Users tab
2. Clicking "Delete" on a test user
3. Confirming deletion
4. Check the "Deleted Users" tab to see the archived record

## Notes

- This table acts as a **soft delete archive**
- Data is never permanently lost
- Useful for compliance, audits, and potential account restoration
- All dates use UTC timezone by default
