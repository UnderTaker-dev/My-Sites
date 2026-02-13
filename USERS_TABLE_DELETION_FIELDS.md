# Users Table - Deletion Request Fields Setup

## Required Fields for Deletion Requests Feature

To enable the user deletion request feature, add these fields to your **Users** table:

### New Fields to Add

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| `DeletionRequested` | Checkbox | Whether user has requested account deletion |
| `DeletionRequestedAt` | Date | Timestamp when deletion was requested |

### Field Configuration

**DeletionRequested** (Checkbox)
- Default: Unchecked/false
- Set to `true` when user clicks "Delete My Account" in their profile

**DeletionRequestedAt** (Date)
- Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- Include time: Yes
- Set automatically when deletion is requested

## Setup Steps

1. Open your Airtable base
2. Go to the **Users** table
3. Click the **+** button to add a new field
4. Add `DeletionRequested` as **Checkbox** type
5. Add `DeletionRequestedAt` as **Date** type (with time)
6. Save changes

## How It Works

**User Flow:**
1. User goes to Profile page
2. Clicks "Delete My Account" in Danger Zone
3. Enters password to confirm identity
4. System sets `DeletionRequested: true` and `DeletionRequestedAt: [timestamp]`
5. User status changes to "Pending Deletion"

**Admin Flow:**
1. Discord notification sent to @Alerts
2. Admin reviews in "Deletion Requests" tab
3. Admin can **Approve** (deletes account) or **Deny** (restores account)

## Notes

- These fields are temporary - cleared when deletion is denied
- After approval, entire user record moves to DeletedUsers table
- Password verification ensures it's actually the user requesting deletion
