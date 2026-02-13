# User Authentication System Setup Guide

## Overview
Complete user signup, login, and profile management system with secure password hashing and session management.

## ⚠️ Important Notes

### Admin vs User Login
**These are TWO SEPARATE systems:**
- **Admin Login**: Easter egg modal (Konami code or 7 footer clicks) → Access to admin dashboard (`/admin.html`)
  - Uses `adminToken` in localStorage
  - Separate authentication system for site administrators
- **User Login**: `/login.html` page → Access to user profiles (`/profile.html`)
  - Uses `userToken` in localStorage  
  - For regular website members/users

**Admins cannot log in through the user login page** - these are independent authentication systems. If you want admins to also have user accounts, they need to sign up separately like any other user.

### Email Verification Status
The email verification system is **FULLY IMPLEMENTED** using your Microsoft Graph API credentials. Here's how it works:

**On User Signup:**
1. User creates account with name, email, and password
2. Account is created in Airtable with `EmailVerified = false`
3. Verification token is generated and stored
4. Verification email is sent via Microsoft Graph API to the user's email address
5. User receives email with verification link (valid for 24 hours)

**Email Verification Flow:**
1. User clicks link in email → Opens `/verify-email.html?token=XXXXX`
2. Token is verified against Airtable `VerificationToken` field
3. Token expiry is checked against `VerificationExpiry` field
4. If valid, `EmailVerified` is set to `true` and tokens are cleared
5. User can now log in with full access

**Login Behavior:**
- Users can log in even if email is NOT verified (flexible approach)
- If email not verified, login shows a warning message
- A "Resend Verification Email" button appears
- Users can request new verification emails via `/resend-verification` function

**Expired Tokens:**
- Verification links expire after 24 hours
- Users can request new verification link
- Old token is replaced with new one

**Microsoft Graph API:**
- Uses your existing Microsoft app credentials in `.env`
- Sends HTML emails from `SENDER_EMAIL` (support@mathi4s.com)
- Professional email templates with branding
- Requires no additional setup - just works!

---

## 📋 Airtable Users Table Setup

### Required Table
Create a new table in your Airtable base called **Users**

### Field Configuration

| Field Name | Field Type | Description | Required |
|------------|-----------|-------------|----------|
| **Name** | Single line text | User's full name | ✅ Yes |
| **Email** | Email | User's email address (unique) | ✅ Yes |
| **PasswordHash** | Long text | Hashed password (salt:hash format) | ✅ Yes |
| **CreatedAt** | Date and time | Account creation timestamp | ✅ Yes |
| **LastLogin** | Date and time | Last successful login timestamp | No |
| **EmailVerified** | Checkbox | Whether email is verified | ✅ Yes |
| **Status** | Single select | Account status (Active, Suspended, Inactive) | No |
| **VerificationToken** | Long text | Email verification token | No |
| **VerificationExpiry** | Date and time | When verification token expires | No |
| **PasswordResetToken** | Long text | Password reset token | No |
| **PasswordResetExpiry** | Date and time | When password reset token expires | No |

### Field Details

#### Name
- **Type**: Single line text
- **Format**: Plain text
- **Example**: "John Doe"

#### Email
- **Type**: Email
- **Format**: Valid email address (lowercase)
- **Example**: "john.doe@example.com"
- **Note**: Should be unique per user

#### PasswordHash
- **Type**: Long text
- **Format**: `salt:hash` where both are hex strings
- **Example**: "a1b2c3d4...e5f6:9g8h7i6j...k5l4"
- **Note**: Never store plain text passwords

#### CreatedAt
- **Type**: Date and time
- **Format**: ISO 8601 timestamp
- **Example**: "2026-02-13T10:30:00.000Z"
- **Include time**: Yes
- **Use GMT**: Yes

#### LastLogin (Optional)
- **Type**: Date and time
- **Format**: ISO 8601 timestamp
- **Updated**: Every successful login

#### EmailVerified
- **Type**: Checkbox
- **Default**: Unchecked (false)
- **Purpose**: Tracks whether user has verified their email address
- **Note**: Required field, set automatically via email verification

#### VerificationToken (Optional)
- **Type**: Long text
- **Format**: 64-character hexadecimal string
- **Example**: "a1b2c3d4e5f6...7890abcdef"
- **Purpose**: Temporary token for email verification link
- **Note**: Cleared after successful verification or when expired

#### VerificationExpiry (Optional)
- **Type**: Date and time
- **Format**: ISO 8601 timestamp
- **Example**: "2026-02-14T10:30:00.000Z"
- **Purpose**: Expiration time for verification token (24 hours from creation)
- **Note**: Checked before validating token

#### PasswordResetToken (Optional)
- **Type**: Long text
- **Format**: 64-character hexadecimal string
- **Example**: "9f8e7d6c5b4a...321098abcdef"
- **Purpose**: Temporary token for password reset link
- **Note**: Cleared after successful password reset or when expired

#### PasswordResetExpiry (Optional)
- **Type**: Date and time
- **Format**: ISO 8601 timestamp
- **Example**: "2026-02-14T11:30:00.000Z"
- **Purpose**: Expiration time for password reset token (1 hour from creation)
- **Note**: Checked before validating token

#### Status (Optional)
- **Type**: Single select
- **Options**: 
  - Active (default)
  - Suspended
  - Inactive
- **Purpose**: Account management and moderation

---

## 🚀 Features Implemented

### User Pages
1. **signup.html** - User registration with:
   - Name, email, password fields
   - Password strength indicator
   - Email validation
   - Disposable email blocking
   - Duplicate email detection
   - Sends verification email upon successful registration
   - Shows verification notice and redirects to login

2. **login.html** - User authentication with:
   - Email and password login
   - Remember me option
   - Forgot password link (links to forgot-password.html)
   - Auto-redirect if already logged in
   - Email verification warning for unverified accounts
   - Resend verification email button

3. **profile.html** - User profile management with:
   - View account information
   - Edit name
   - Change password
   - Logout functionality
   - Member since date display

4. **verify-email.html** - Email verification landing page with:
   - Automatic token extraction from URL
   - Three UI states: Loading, Success, Error
   - Resend verification option for expired tokens
   - Countdown timer for redirect
   - Mobile responsive design

5. **forgot-password.html** - Password reset request with:
   - Email input form
   - Sends password reset email
   - Security info box
   - Loading states
   - Success confirmation

6. **reset-password.html** - Password reset form with:
   - New password input with strength indicator
   - Password confirmation
   - Token validation
   - Expiry checking
   - Auto-redirect to login after success
   - Resend verification option for expired tokens
   - Countdown timer for redirect
   - Mobile responsive design

### Serverless Functions

#### register-user.js
- **Path**: `/.netlify/functions/register-user`
- **Method**: POST
- **Purpose**: Create new user account
- **Input**: `{ name, email, password }`
- **Validation**:
  - Name minimum 2 characters
  - Valid email format
  - No disposable emails
  - Password minimum 8 characters
  - Duplicate email check
- **Actions**:
  - Creates user in Airtable with EmailVerified=false
  - Generates 64-character verification token
  - Sets 24-hour expiry for verification
  - Sends verification email via Microsoft Graph API
- **Returns**: `{ success, userId, message }`
- **Note**: Registration succeeds even if email fails to send

#### login-user.js
- **Path**: `/.netlify/functions/login-user`
- **Method**: POST
- **Purpose**: Authenticate user and issue token
- **Input**: `{ email, password }`
- **Returns**: `{ success, token, userId, name, email, emailVerified }`
- **Updates**: LastLogin timestamp

#### get-user-profile.js
- **Path**: `/.netlify/functions/get-user-profile`
- **Method**: GET
- **Purpose**: Retrieve user profile data
- **Auth**: Bearer token required
- **Returns**: User profile details

#### update-user-profile.js
- **Path**: `/.netlify/functions/update-user-profile`
- **Method**: POST
- **Purpose**: Update user name
- **Auth**: Bearer token required
- **Input**: `{ name }`

#### change-password.js
- **Path**: `/.netlify/functions/change-password`
- **Method**: POST
- **Purpose**: Change user password
- **Auth**: Bearer token required
- **Input**: `{ currentPassword, newPassword }`
- **Validation**: Verifies current password before updating

#### verify-email.js
- **Path**: `/.netlify/functions/verify-email`
- **Method**: POST
- **Purpose**: Verify user's email address using verification token
- **Input**: `{ token }`
- **Validation**:
  - Token must match record in Airtable
  - Email must not already be verified
  - Token must not be expired
- **Returns**: `{ success, message, email }`
- **Updates**: Sets EmailVerified to true, clears VerificationToken and VerificationExpiry

#### resend-verification.js
- **Path**: `/.netlify/functions/resend-verification`
- **Method**: POST
- **Purpose**: Send new verification email for unverified accounts
- **Input**: `{ email }`
- **Validation**:
  - User must exist
  - Email must not already be verified
- **Actions**:
  - Generates new 64-character verification token
  - Sets new 24-hour expiry
  - Sends verification email via Microsoft Graph API
- **Returns**: `{ success, message }`

#### request-password-reset.js
- **Path**: `/.netlify/functions/request-password-reset`
- **Method**: POST
- **Purpose**: Request password reset email
- **Input**: `{ email }`
- **Security**: Always returns success (doesn't reveal if email exists)
- **Actions**:
  - Finds user by email
  - Generates 64-character reset token
  - Sets 1-hour expiry
  - Sends password reset email via Microsoft Graph API
- **Returns**: `{ success, message }`

#### reset-password.js
- **Path**: `/.netlify/functions/reset-password`
- **Method**: POST
- **Purpose**: Reset password using reset token
- **Input**: `{ token, newPassword }`
- **Validation**:
  - Token must match record in Airtable
  - Token must not be expired
  - Password minimum 8 characters
- **Actions**:
  - Hashes new password
  - Updates PasswordHash
  - Clears PasswordResetToken and PasswordResetExpiry
- **Returns**: `{ success, message }`

---

## 🔐 Security Features

### Password Security
- **Hashing**: PBKDF2 with SHA-512
- **Salt**: Unique 16-byte random salt per password
- **Iterations**: 10,000 rounds
- **Key Length**: 64 bytes
- **Format**: `salt:hash` (both hex-encoded)

### Token Authentication
- **Storage**: localStorage (client-side)
- **Format**: Base64-encoded JSON payload
- **Contents**: userId, email, timestamp, random nonce
- **Validation**: Token decoded and userId verified on each request

### Input Validation
- Email format validation with regex
- Disposable email domain blocking
- Password minimum length (8 characters)
- Name minimum length (2 characters)
- Account status checking (Active required)

---

## 📝 Usage Guide

### For Users

#### Sign Up
1. Visit `/signup.html`
2. Enter full name, email, and strong password
3. Click "Create Account"
4. Redirected to login page on success

#### Log In
1. Visit `/login.html`
2. Enter email and password
3. Optional: Check "Remember me"
4. Click "Log In"
5. Redirected to profile page

#### View/Edit Profile
1. Must be logged in
2. Visit `/profile.html`
3. View account information
4. Edit name and save
5. Change password if needed
6. Click "Logout" to sign out

### For Developers

#### Check Authentication
```javascript
const userToken = localStorage.getItem('userToken');
const userId = localStorage.getItem('userId');
const userName = localStorage.getItem('userName');
const userEmail = localStorage.getItem('userEmail');

if (!userToken) {
  // User not logged in
  window.location.href = '/login.html';
}
```

#### Make Authenticated Request
```javascript
const userToken = localStorage.getItem('userToken');

const response = await fetch('/.netlify/functions/get-user-profile', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});
```

#### Logout User
```javascript
localStorage.removeItem('userToken');
localStorage.removeItem('userId');
localStorage.removeItem('userName');
localStorage.removeItem('userEmail');
window.location.href = '/login.html';
```

---

## 🔗 Integration with Existing Site

### Add Login/Signup Links
Add these links to your main navigation or homepage:

```html
<!-- In navigation -->
<a href="/signup.html">Sign Up</a>
<a href="/login.html">Login</a>

<!-- Show when user is logged in -->
<a href="/profile.html">My Profile</a>
```

### Show User Status
```javascript
const userName = localStorage.getItem('userName');
if (userName) {
  // User is logged in
  document.getElementById('userGreeting').textContent = `Welcome, ${userName}!`;
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('profileBtn').style.display = 'block';
} else {
  // User not logged in
  document.getElementById('loginBtn').style.display = 'block';
  document.getElementById('profileBtn').style.display = 'none';
}
```

---

## � Email Service Configuration

The email verification system uses Microsoft Graph API to send emails. Your `.env` file should contain:

```env
# Microsoft Graph API (for email verification)
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
SENDER_EMAIL=support@mathi4s.com
```

### Microsoft Graph API Permissions
Your Azure app registration needs the following API permission:
- **Mail.Send** (Application permission)

### Testing Email Delivery
1. Ensure the Microsoft app has proper permissions configured
2. Verify `support@mathi4s.com` mailbox exists and is accessible
3. Test signup flow and check if verification email arrives
4. Check Netlify function logs if email fails to send

---

## 🎯 Future Enhancements

### Ready to Implement

1. **Social Login**
   - Google OAuth
   - GitHub OAuth
   - Discord OAuth

2. **User Roles**
   - Basic user (default)
   - Premium user
   - Moderator
   - Administrator

3. **Profile Enhancements**
   - Profile picture upload
   - Bio/About section
   - Social media links
   - Timezone preference

4. **Security Enhancements**
   - Two-factor authentication (2FA)
   - Login history
   - Device management
   - Session timeout

---

## 🐛 Troubleshooting

### Common Issues

#### "Email already registered" error
- Email already exists in Users table
- Try logging in instead or use different email

#### "Invalid token" error
- Token expired or corrupted
- Clear localStorage and login again
- Check token format in serverless function

#### Can't login after signup
- Verify PasswordHash was stored correctly
- Check if Status field is set to "Active"
- Look at Netlify function logs for errors

#### Profile page shows "Unauthorized"
- Token missing or invalid
- Login again
- Check Authorization header format

---

## ✅ Testing Checklist

- [ ] Create Users table in Airtable with all required fields
- [ ] Add VerificationToken (Long text) and VerificationExpiry (Date and time) fields
- [ ] Add PasswordResetToken (Long text) and PasswordResetExpiry (Date and time) fields
- [ ] Users table is shared with API key used in environment variables
- [ ] Verify Microsoft Graph API credentials are in `.env`
- [ ] Test user signup with valid data
- [ ] Check if verification email is received
- [ ] Test email verification link (click link in email)
- [ ] Test expired verification token handling
- [ ] Test resend verification email functionality
- [ ] Test signup validation (short password, invalid email)
- [ ] Test duplicate email detection
- [ ] Test user login with correct credentials
- [ ] Test login shows warning for unverified email
- [ ] Test login with wrong password
- [ ] Test "Forgot Password" link on login page
- [ ] Test password reset request (check if email arrives)
- [ ] Test password reset link from email
- [ ] Test expired password reset token handling
- [ ] Test password reset with mismatched passwords
- [ ] Test login with newly reset password
- [ ] Test profile page loads user data
- [ ] Test updating user name
- [ ] Test changing password
- [ ] Test logout functionality
- [ ] Test protected pages redirect when not logged in

---

## 📞 Support

If you encounter any issues:
1. Check Netlify function logs for errors
2. Verify Airtable table name is exactly "Users"
3. Ensure all required fields exist in Airtable
4. Check browser console for JavaScript errors
5. Verify CORS headers are working

---

**Note**: This system uses client-side token storage which is suitable for basic authentication. For production applications handling sensitive data, consider implementing more robust security measures like HTTP-only cookies, refresh tokens, and server-side session management.
