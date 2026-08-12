# Prime IV Loyalty Portal Demo Script

This script is designed for a 12 to 15 minute live demonstration. It presents the customer experience first, followed by the admin experience.

## Before the demo

Prepare the following before the audience joins:

- Open the customer portal in a mobile-sized browser window or on a phone.
- Open the admin portal in a desktop browser window.
- Sign in to the prepared customer and administrator accounts in separate browser profiles.
- Allow camera permission for the admin browser if demonstrating live QR scanning.
- Confirm that the customer has at least one upcoming appointment.
- Confirm that the customer QR loads correctly.
- Confirm that the spa's GoHighLevel connection shows as connected.
- Keep a screenshot of a successful QR scan and populated GHL fields available as a fallback.
- Do not display passwords, API keys, private integration tokens, or environment variables.

## Opening

### Narration

> Today I am demonstrating the Prime IV Loyalty Portal, a multi-spa loyalty, self-booking, and customer engagement platform. It gives customers a simple mobile-first experience while giving each spa its own secure admin workspace.
>
> Every customer, appointment, visit, reward, product, staff account, signup link, and integration belongs to one specific spa. Data from one spa is not visible to another.

## Part 1: Customer portal

### 1. Customer loyalty dashboard

Open **My Loyalty Card**.

### Narration

> This is the customer's main dashboard. It immediately shows their verified visit count, current loyalty progress, next available reward, and the complete five-visit journey.
>
> The rewards are database-driven. When a spa administrator changes a reward, the updated name and description appear here for that spa's customers.

Point out:

- Customer greeting
- Current visit count and completion percentage
- Next reward card
- Five loyalty milestones
- **Show QR** action

### 2. Self-booking

Open **Schedule My Visit**.

### Narration

> The customer can choose from the products and services configured by their spa. These options are loaded from the database, not hard-coded into the customer interface.
>
> Customers may self-book a preferred date and time. Walk-ins are also welcome, so self-booking is optional.

Actions:

1. Select a product or service.
2. Click **Schedule date and time**.
3. Choose a future date and time.
4. Complete the self-booking.

### Narration after booking

> The appointment is now stored in the database. It will appear in the customer's activity history and on the correct spa's admin calendar.

### 3. Member QR and PWA

Open **My QR**.

### Narration

> Every customer receives a unique member QR. The QR contains an opaque token, not the customer's name, phone number, email address, or other personal information.
>
> At the spa, the customer simply shows this digital member pass to a staff member for check-in.

Point out:

- Digital member pass
- Customer name and member ID
- **Download QR** button
- **Download App** button

### Narration

> The customer can download the QR for quick access. They can also install the portal as a Progressive Web App, which places it on their phone like an app without requiring an app-store download.

If demonstrating installation, click **Download App** and show the native browser prompt. On iPhone, explain that the user selects **Share**, then **Add to Home Screen**.

### 4. Customer information

Open **My Information**.

### Narration

> Customers can maintain their own contact information, optional gender, optional address, and profile photo. The avatar is also displayed in the portal header.
>
> The portal includes a privacy policy explaining that customer information is used only to provide and support the loyalty experience and related spa services.

Point out:

- Editable contact details
- Profile avatar
- Member ID and active status
- Privacy Policy and Rewards Terms links

### 5. Customer activity

Open **Activity Logs**.

### Narration

> The customer receives a readable history of appointments, cancellations, verified visits, earned rewards, and redeemed rewards. Every entry includes the date and time.

Point out:

- Self-booking entry
- Completed visit entry
- Earned reward entry and reward icon
- Upcoming appointment cancellation, if available

## Part 2: Admin portal

Switch to the desktop admin portal.

### 6. Admin overview

Open **Overview**.

### Narration

> The admin workspace is designed for desktop use. The overview combines operational information with live spa analytics.

Point out:

- Total customers
- Verified visits
- Rewards issued
- Scheduled today
- Customer growth
- Seven-day visit trend
- Appointment completion
- Loyalty engagement
- Today's appointment list
- Emphasized **Scan QR** action

Change the date filter to demonstrate different reporting periods.

### 7. QR check-in and loyalty advancement

Click **Scan QR**.

Use one of these methods:

- Scan the customer's QR with the camera.
- Enter the prepared customer member code as a fallback.

### Narration

> A valid scan verifies that the customer belongs to this spa and records exactly one verified visit. The loyalty card advances, the visit and last-visit records update, and a matching appointment is completed when applicable.
>
> The completed appointment is removed from the active calendar but remains in activity history. If the customer is linked to GoHighLevel, the portal also updates that specific contact's visit fields.

Show the successful confirmation, then refresh or return to the customer portal and show the loyalty milestone advancing.

### 8. Customer management

Open **Customers**.

### Narration

> This table contains customers for the active spa only. Staff accounts are excluded, and customers from other spas cannot appear here.

Demonstrate:

1. Search for the customer by name or member code.
2. Click the customer row.
3. Show the customer detail modal.

Point out:

- Contact information
- Member code
- Verified visit count
- Last visit date and time
- GHL synchronization status
- Manual visit controls

### Narration

> Authorized administrators can correct a visit count or last-visit record when necessary. These controls are for operational corrections, and the changes are recorded in the database.

### 9. Calendar

Open **Calendar**.

### Narration

> The monthly calendar shows active self-booked appointments with the appointment time, service, and customer. Completed and cancelled appointments are removed from the active calendar so the team sees what still requires attention.

Navigate between months if useful.

### 10. Admin logs

Open **Logs**.

### Narration

> Admin logs show the latest customer registrations, self-bookings, cancellations, successful check-ins, and related customer details with timestamps.

### 11. Loyalty and offers

Open **Spa Settings**, then **Loyalty & Offers**.

### Narration

> Each spa controls its own loyalty journey. An administrator can edit the reward name, description, terms, expiration period, and active status for each visit milestone.

Open a reward editor without saving, or make a prepared harmless edit and show it reflected in the customer portal.

### 12. Products and services

Open **Products & Services**.

### Narration

> The spa also manages its own product and service catalog. Administrators can add, edit, or remove scheduling options. Bookable items appear directly in the customer's self-booking screen.

Point out:

- Add product or service
- Bookable versus reward-only items
- Edit action
- Safe delete/archive action

### 13. Staff and access

Open **Staff & Access**.

### Narration

> Managers and administrators can add spa team members and assign staff, manager, or admin roles. Staff accounts are linked to the spa and do not appear as loyalty customers.

### 14. Spa settings and signup tools

Return to **Spa Settings**.

### Narration

> Each spa has its own identity, Spa ID, signup token, and integration settings.

Point out:

- Spa name and portal slug
- Support contact fields
- Permanent Spa ID
- **Copy signup link**
- **Get signup snippet**

### Narration

> The signup link automatically places new customers in the correct spa. The signup snippet is a standalone, responsive website section that a spa can paste into its existing website.

## Part 3: GoHighLevel integration

In **Spa Settings**, show **Sync to GoHighLevel**.

### Narration

> Every spa can connect its own GoHighLevel sub-account using a Location ID and encrypted Private Integration Token. The token is encrypted before storage and is never returned to the browser.
>
> The portal finds the custom-field IDs for Spa_Visits and Last_Spa_Visits. It searches for existing contacts by exact email, phone number, or full name. It never creates a new GHL contact.
>
> For a matched contact, the portal updates only two fields: the verified visit count and the last verified visit date. No name, phone, email, address, source, tag, or other contact data is modified.

Open **Customers** and point out:

- **GHL synced** status
- **Not in GHL** status
- **Sync to GHL** action

If available, show the GHL contact with populated `Spa_Visits` and `Last_Spa_Visits` fields.

## Closing statement

### Narration

> Prime IV Loyalty brings the complete customer journey into one system: spa-specific registration, self-booking, secure QR check-in, loyalty progression, reward history, customer management, calendar operations, analytics, and focused GoHighLevel synchronization.
>
> The platform is built with React and Next.js, Supabase and PostgreSQL, Vercel, and GitHub. Its multi-spa architecture keeps every spa's customers, staff, services, rewards, visits, appointments, and integrations isolated by Spa ID.

## Short five-minute version

If presentation time is limited, demonstrate only:

1. Customer loyalty card and next reward.
2. Customer self-booking.
3. Customer member QR.
4. Admin overview and analytics.
5. Admin QR scan and successful visit.
6. Customer loyalty card advancing.
7. Customer detail modal with visits and last visit.
8. GHL fields updating for the matched contact.

## Live-demo fallback lines

### Camera permission is unavailable

> The scanner supports live camera input, but it also accepts the member code as an operational fallback. I will use that method for this demonstration.

### PWA prompt does not appear

> Browser installation prompts depend on the device and browser. On supported Android and desktop browsers, this opens the native install prompt. On iPhone, the user selects Share and Add to Home Screen.

### GHL is temporarily unavailable

> The portal stores synchronization status and errors per customer. The customer and loyalty workflows remain available even if the external integration is temporarily unavailable.

### Email confirmation delays registration

> Supabase email confirmation is enabled for account security. I will continue with a prepared confirmed customer account.
