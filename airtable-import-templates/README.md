# Airtable Import Templates

This folder contains CSV templates for importing into your Airtable base.

## How to Import

1. Go to your Airtable base (use your AIRTABLE_BASE_ID from .env)
2. For each table, click the dropdown arrow next to the table name → **Import data** → **CSV file**
3. Upload the corresponding CSV file
4. Map the columns correctly
5. Click **Import**

## Tables Structure

### 1. Subscribers (IMPROVED ✨)
**Fields:**
- `Email` (Email, Primary field) - Subscriber's email address
- `Subscribed Date` (Date) - When they subscribed
- `Source` (Single select: Homepage Form, Admin Import, API) - Where they subscribed from
- `IP Address` (Single line text) - Their IP for tracking
- `Status` (Single select: Active, Bounced, Complained) - Email status
- `Notes` (Long text) - Additional notes

**Purpose:** Store newsletter subscriber emails with tracking info

**Suggested Views:**
- "Active Subscribers" (filter: Status = Active)
- "Recent Signups" (sort: Subscribed Date, descending)
- "By Source" (group by: Source)

---

### 2. Unsubscribed (IMPROVED ✨)
**Fields:**
- `Email` (Email, Primary field) - Who unsubscribed
- `Unsubscribed Date` (Date) - When they unsubscribed
- `Previously Subscribed Date` (Date) - When they originally subscribed
- `Reason` (Single select: Not interested, Too many emails, Irrelevant content, Other) - Why they left
- `IP Address` (Single line text) - Their IP

**Purpose:** Track unsubscribed users and understand why they left

**Suggested Views:**
- "By Reason" (group by: Reason)
- "Recent Unsubscribes" (sort: Unsubscribed Date, descending)

---

### 3. TechStack (IMPROVED ✨)
**Fields:**
- `Icon` (Single line text) - Emoji icon
- `Name` (Single line text, Primary field) - Technology name
- `Order` (Number) - Display order on website
- `Category` (Single select: Language, Framework, Runtime, Styling, Backend, DevOps, Cloud, Database, Tool) - Type of tech
- `Proficiency` (Single select: Beginner, Intermediate, Advanced, Expert) - Skill level
- `Years Experience` (Number) - How many years you've used it

**Purpose:** Display tech skills on homepage with detailed info

**Suggested Views:**
- "By Category" (group by: Category)
- "Expert Skills" (filter: Proficiency = Expert)
- "Website Display Order" (sort: Order, ascending)

**Note:** You can filter which skills to show on the website based on proficiency

---

### 4. PageViews (NEW)
**Fields:**
- `Page` (Single line text, Primary field)
- `Timestamp` (Date with time)
- `IP Address` (Single line text)
- `User Agent` (Long text)
- `Device` (Single line text) - Desktop, Mobile, or Tablet
- `Browser` (Single line text) - Chrome, Firefox, Safari, Edge, etc.
- `OS` (Single line text) - Windows, macOS, Linux, Android, iOS, etc.

**Purpose:** Track page visits with detailed device analytics

**Note:** 
- Use Views to create:
  - "Today's Views" (filter: Timestamp is today)
  - "This Week" (filter: Timestamp is within last 7 days)
  - "By Page" (group by: Page)
  - "By Device" (group by: Device)
  - "By Browser" (group by: Browser)
  - "Mobile Traffic" (filter: Device = Mobile)

---

### 5. Donations (NEW)
**Fields:**
- `Amount` (Currency, format: $0.00)
- `Currency` (Single select: USD, EUR, GBP)
- `Email` (Email)
- `Stripe Session ID` (Single line text, Primary field)
- `Status` (Single select: pending, completed, failed)
- `Timestamp` (Date with time)

**Purpose:** Track Stripe donations

**Note:**
- Create a formula field for total: `SUM({Amount})`
- Use Views to create:
  - "Completed Donations" (filter: Status = completed)
  - "This Month" (filter: Timestamp is within this month)
  - "By Donor" (group by: Email)

---

## After Importing

1. **Delete example rows** - The CSV files contain example data, delete these after import
2. **Set up Views** - Create filtered views as suggested above
3. **Verify field types** - Make sure:
   - Date fields are set to "Date" or "Date with time"
   - Amount field is set to "Currency"
   - Email field is set to "Email"
4. **Set primary fields** - Make sure the first field in each table is marked as primary

## API Integration

After setting up tables, the following functions will work:
- ✅ Newsletter subscribe/unsubscribe
- ✅ Tech stack editor
- ✅ Page view tracking (will be implemented next)
- ✅ Donation tracking (will be implemented next)

## Notes

- **Subscribers** and **Unsubscribed** tables are already working
- **TechStack** table is already working (can have 10+ items now)
- **PageViews** and **Donations** tables need backend functions (will be created next)
