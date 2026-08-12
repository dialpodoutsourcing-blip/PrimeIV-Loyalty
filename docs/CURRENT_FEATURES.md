# Current Features

This document summarizes the functionality currently implemented in the Prime IV Loyalty Portal.

## Customer portal

- Mobile-first responsive customer dashboard
- Desktop and tablet layouts
- Sidebar navigation on desktop
- Compact mobile navigation
- Customer authentication through Supabase Auth
- Spa-specific customer registration links
- Required registration fields:
  - First name
  - Last name
  - Email address
  - Phone number
  - Password
- Email-confirmation support
- Direct login action after successful registration
- Logout control

## Loyalty card

- Five-visit loyalty journey
- Database-driven loyalty programs and reward milestones
- Current visit count and completion percentage
- Next-reward display
- Visit-specific reward names and descriptions
- Earned reward records
- Reward redemption status
- Reward activity history
- Admin-configurable rewards and terms
- Repeatable loyalty cycles supported by the database

## Member QR

- Unique opaque QR token for every customer
- QR contains no personal information
- Dedicated My QR module
- QR modal accessible from the loyalty card
- Camera-based admin QR scanner
- Manual member-code fallback
- Support for `primeiv://member/{token}` QR values
- Cross-spa QR validation
- One verified visit per successful check-in request
- Idempotent visit recording support

## Scheduling

- Database-driven products and services
- Default bookable services:
  - Hydration IV
  - Wellness injection
  - Consultation
  - Not sure yet
- Customer self-booking
- Date and time selection
- Walk-in-friendly portal messaging
- Upcoming appointment display
- Customer appointment cancellation before the appointment time
- Completed and cancelled appointment history
- Matching appointment completion during QR check-in

## Customer information

- Editable customer profile
- First and last name
- Phone number
- Optional gender
- Optional address
- Profile avatar upload
- Avatar displayed in the portal header
- Member code and account status display
- Basic privacy policy modal
- Rewards terms modal

## Customer activity logs

- Dedicated Activity Logs module
- Scrollable activity history
- Human-readable activity descriptions
- Date and time on every activity
- Self-booking events
- Appointment confirmations
- Appointment cancellations
- Completed spa visits
- Earned rewards
- Redeemed rewards
- Gamified reward icons

## Admin portal

- Desktop-only admin workspace
- Spa-scoped administrator access
- Sidebar modules:
  - Overview
  - Customers
  - Calendar
  - Logs
  - Spa Settings
- Logout control
- Current spa display
- Responsive blocking screen on unsupported small displays

## Admin overview

- Date-range filter
- Total customer count
- Verified visit count
- Rewards-issued count
- Scheduled-today count
- Today's appointment list with customer names
- QR scanner shortcut
- Live data from Supabase

## Customer management

- Spa-isolated customer table
- Staff accounts excluded from customers
- Search by customer name or member code
- Verified visit count
- Last visit date and time
- Customer detail preview
- Edit action
- Manual visit addition
- Latest-visit reversal
- Manual visit-count correction
- Manual last-visit correction
- Administrator correction audit trail
- GHL synchronization status badges

## Admin calendar

- Monthly calendar view
- Previous and next month controls
- Active self-booked appointments
- Appointment time, service, and customer name
- Completed and cancelled appointments excluded from the active calendar

## Admin activity logs

- Dedicated Logs module
- Customer registrations
- Self-bookings
- Cancellations
- Successful QR check-ins
- Customer names and relevant details
- Date and time on each event

## Loyalty and offers management

- Database-backed loyalty configuration
- Default five-visit reward program
- Edit reward name
- Edit description
- Edit optional terms
- Edit optional expiration period
- Enable or disable rewards
- Changes reflected in the customer loyalty card

## Products and services management

- Database-backed service catalog
- Spa-specific products and services
- Bookable and reward-only items
- Categories
- Descriptions
- Display order
- Active status
- Customer scheduling reflects admin changes

## Staff and access management

- Manager/admin-only staff creation
- Spa-scoped staff accounts
- Staff, manager, and admin roles
- Temporary-password creation flow
- Active staff status
- Staff list
- Staff accounts tagged through `staff_memberships`
- Staff accounts excluded from customer loyalty accounts

## Spa settings

- Multi-spa tenant records
- Spa name and slug fields
- Support email and phone fields
- Permanent tenant ID
- Unique signup token for each spa
- Copy signup-link button
- Standalone website-widget snippet generator

## Website signup widget

- Complete standalone HTML, CSS, and JavaScript snippet
- Unique `pc-piv-loyalty-widget` CSS and ID namespace
- Responsive on desktop, tablet, and mobile
- Featured-section presentation
- Five-visit punch-card preview
- Reward milestone examples
- Customer benefit cards
- Spa-specific registration CTA
- No manual URL editing required
- Host-site style isolation

## Multi-spa database architecture

- UUID primary key for every spa
- Spa ownership key on all tenant-owned tables
- Composite foreign keys prevent cross-spa relationships
- Spa-specific:
  - Customers
  - Staff
  - Locations
  - Services
  - Loyalty programs
  - Rewards
  - Appointments
  - Visits
  - Reward awards
  - Audit events
  - GHL connections
- Tenant-aware Row Level Security policies
- Existing data assigned to the initial spa during migration

## GoHighLevel integration

- Separate encrypted GHL connection per spa
- Location ID storage
- Encrypted Private Integration Token storage
- GHL PIT is never returned to the browser
- Automatic lookup of custom-field IDs:
  - `Spa_Visits`
  - `Last_Spa_Visits`
- Confirmation displays both mapped field IDs
- GHL contact search within the connected sub-account
- Customer matching by:
  - Exact email
  - Exact phone number
  - Exact full name
- Matched GHL contact ID saved on the customer profile
- GHL synchronization states:
  - Pending
  - GHL synced
  - Not in GHL
  - GHL error
- Bulk matching skips already-linked customers
- The portal never creates a GHL contact
- Only the following GHL fields are updated for matched contacts:
  - `Spa_Visits` with the numeric verified visit count
  - `Last_Spa_Visits` with a `YYYY-MM-DD` date
- `Last_Spa_Visits` is omitted when no last visit exists
- No customer name, email, phone, address, tags, source, or other GHL fields are modified
- Specific-contact field refresh after:
  - QR check-in
  - Manual visit addition
  - Visit reversal
  - Visit-count correction
  - Last-visit correction

## Security and privacy

- Supabase authentication
- Row Level Security
- Spa-scoped staff access checks
- Manager/admin authorization for privileged actions
- Service-role operations limited to server routes
- Browser-safe Supabase key separated from server secret
- GHL PIT encrypted with AES-256-GCM
- Opaque QR tokens
- No personal information encoded in QR values
- Audit events for privileged actions
- Privacy-policy modal
- `.env.local` and seed credentials excluded from Git

## Database and operational features

- PostgreSQL/Supabase schema
- SQL migrations for existing databases
- Seed script for the sample spa and accounts
- Updated-at triggers
- Database constraints and indexes
- Idempotent visit recording
- Reward issuance from verified visits
- Reward redemption workflow
- Appointment statuses
- Visit reversal records
- Audit-event history

## Deployment readiness

- Next.js React application
- Production builds passing
- Environment-variable template
- Vercel-compatible configuration
- GitHub repository integration
- PWA readiness planned for a later phase

## Current limitations and future work

- PWA manifest, service worker, and installation experience are not yet enabled
- Full automated test coverage is not yet complete
- General spa settings currently require further end-to-end editing integration
- Advanced staff editing and deactivation workflows can be expanded
- GHL synchronization monitoring and retry controls can be expanded
- Notification delivery is not yet implemented
