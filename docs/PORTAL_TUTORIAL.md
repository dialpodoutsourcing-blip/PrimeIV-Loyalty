# Prime IV Loyalty Portal Tutorial

This guide explains how spa administrators, staff members, and customers use the Prime IV Loyalty Portal.

## Portal overview

The portal is a multi-spa loyalty system. Every customer, staff member, service, reward, appointment, visit, GHL connection, and signup link belongs to one specific spa.

Customers from one spa are not visible to another spa.

## Customer registration

Each spa has a unique customer signup URL.

To copy it:

1. Sign in to the admin portal.
2. Find **Copy signup link** near the bottom of the sidebar.
3. Click the button.
4. Share the copied URL with customers of that spa.

Customers registering through this URL are automatically assigned to the correct spa. They provide:

- First name
- Last name
- Email address
- Phone number
- Password

After registration, the customer can continue to the login page. When Supabase email confirmation is enabled, the customer must confirm their email before signing in.

## Website signup widget

The admin sidebar includes **Get signup snippet** above the signup-link button.

Clicking it copies a standalone HTML, CSS, and JavaScript widget. Paste the complete snippet into an HTML or custom-code area on the spa's website.

The widget includes:

- A responsive five-visit loyalty card preview
- Reward examples
- Member QR and self-booking benefits
- A signup call-to-action
- The spa's unique signup URL

The widget uses the `pc-piv-loyalty-widget` namespace so its styles do not interfere with the host website.

## Customer portal

### My Loyalty Card

The loyalty dashboard shows:

- Completed visits
- Current progress
- The next reward
- Five loyalty milestones
- A shortcut to the member QR

Progress changes only when a verified spa visit is recorded or an administrator performs an authorized correction.

### Schedule My Visit

Customers can select an available product or service and self-book a date and time. Walk-ins are also welcome.

Upcoming bookings appear in account activity and on the spa's admin calendar. A customer can cancel an upcoming appointment before its scheduled time.

### My QR

The member QR contains an opaque QR token, not personal information.

At check-in:

1. The customer opens **My QR**.
2. A staff member scans it from the admin portal.
3. The portal confirms that the QR belongs to the same spa.
4. One verified visit is recorded.
5. The loyalty card advances.
6. A matching appointment is completed when applicable.

### My Information

Customers can maintain their contact details and profile photo. Optional fields include gender and address.

The profile photo also appears in the customer portal header.

### Activity Logs

Customer activity logs provide readable dates and times for:

- Appointments
- Cancellations
- Completed spa visits
- Earned rewards
- Redeemed rewards

## Admin portal

The admin portal is intended for desktop use.

### Overview

The overview shows:

- Total customers
- Verified visits
- Rewards issued
- Scheduled appointments
- Today's appointments
- QR scanner shortcut

Use the date filter to change the reporting period.

### Searching for customers

Use the search box in the top-right header. It filters the customer table by customer name or member code.

### Customers

The Customers module displays:

- Customer name
- Member code
- Verified visits
- Last visit date and time
- Account status
- GHL synchronization status

Use **Edit** to view a customer and make an authorized visit correction. Manual corrections affect loyalty progress and are intended only for fixing verified check-in records.

### Recording a visit

From Overview:

1. Click **Open scanner** or **Scan QR**.
2. Allow camera access.
3. Scan the customer's member QR.
4. Confirm the successful check-in message.

The portal records one visit, updates the customer's loyalty progress, completes a matching appointment, and refreshes the activity records.

The member code beginning with `PIV-` may also be entered manually. A QR URL such as `primeiv://member/...` is accepted by the scanner.

### Calendar

The Calendar module shows active self-booked appointments in a monthly view. Completed and cancelled appointments are removed from the active calendar but remain available in activity history.

### Logs

Admin logs show customer registrations, self-bookings, cancellations, and successful check-ins with customer details, date, and time.

### Loyalty & Offers

Administrators can edit each visit milestone's:

- Reward name
- Description
- Optional terms
- Optional expiration period
- Active status

Changes are stored in Supabase and appear on the customer loyalty card.

### Products & Services

Administrators can manage the products and services shown during customer self-booking. Default options include:

- Hydration IV
- Wellness injection
- Consultation
- Not sure yet

Database changes are reflected in the customer portal.

### Staff & Access

Managers and administrators can add team members with one of these roles:

- Staff
- Manager
- Admin

Staff accounts are linked to the current spa and excluded from the customer list. A staff account does not receive a customer loyalty account.

## GoHighLevel integration

### Connecting a spa

Open **Spa Settings**, then locate **Sync to GoHighLevel**.

Enter:

- GHL Location ID
- Location Private Integration Token (PIT)

The PIT is encrypted before database storage and is never returned to the browser.

The PIT requires these permissions:

- `contacts.readonly`
- `contacts.write`
- `locations/customFields.readonly`

When the connection is saved, the portal finds and stores the IDs for:

- `Spa_Visits`
- `Last_Spa_Visits`

### Matching customers

Click **Sync to GHL** in the Customers module.

The portal searches only within the connected spa's GHL sub-account. It compares:

- Email address
- Phone number
- Full name

The portal never creates a GHL contact.

When a match is found, its GHL contact ID is saved on the portal customer and the status becomes **GHL synced**. When no match exists, the status becomes **Not in GHL**.

Customers already linked to GHL are skipped during bulk matching.

### Visit fields sent to GHL

For a matched customer, the portal updates only these two GHL fields:

| Portal value | GHL custom field | Format |
| --- | --- | --- |
| Verified visit count | `Spa_Visits` | Number |
| Last verified visit | `Last_Spa_Visits` | `YYYY-MM-DD` date |

No name, email, phone, address, tags, source, or other GHL contact fields are modified.

If the customer has no last visit, `Last_Spa_Visits` is omitted from the GHL request. The portal never sends a null or empty value to this date field.

The two values are refreshed for that specific matched contact when:

- A QR visit is recorded
- An administrator manually adds a visit
- The latest visit is reversed
- Visit count or last-visit date is corrected

The attached GHL result showing `Spa_Visits = 1` and `Last_Spa_Visits = Aug 12, 2026` confirms that the mapped fields are being populated successfully.

## Logout

Both customer and admin portals include a logout control. Always log out on a shared device.

## Troubleshooting

### Customer shows Not in GHL

Confirm that the contact exists in the connected sub-account and that the portal name, email, or phone matches the GHL record.

### Customer shows GHL error

Review the saved sync error and verify:

- The Location ID belongs to the intended sub-account
- The PIT is valid
- Required PIT permissions are enabled
- Both GHL custom fields still exist
- The stored custom-field IDs are correct

### Camera scanner is unavailable

Use HTTPS or localhost, grant camera permission, and use a current browser. The member code can be entered manually as a fallback.

### Signup link is unavailable

Confirm that the spa has a `signup_token` and that the administrator is assigned to the same active spa.
