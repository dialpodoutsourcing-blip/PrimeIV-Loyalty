# Product Requirements

## Purpose

Replace a physical punch/scratch card with a trustworthy digital loyalty experience. Guests should enjoy clear progress while spa staff get a fast, auditable way to confirm visits and redeem rewards.

## Users

- **Guest:** signs in with minimal friction, sees progress and rewards, and presents an account at check-in.
- **Staff:** uses a desktop to locate a guest, record an eligible visit, and redeem a reward.
- **Manager/admin:** manages staff access and reward configuration, reviews audits, and performs corrections.

## MVP scope

### Guest

- Passwordless sign-in using email initially; phone OTP requires later provider/cost review.
- Mobile-first loyalty card with completed, current, and upcoming milestones.
- Next-reward summary, available reward details, and punch/redemption history.
- Profile, sign-out, and a short-lived QR or human-readable member code.

### Staff

- Desktop-only authenticated portal.
- Search by member code, email, phone, or name with privacy-conscious results.
- Scan or enter a member code and verify guest identity.
- Record one verified punch for an eligible visit.
- Redeem an available reward after explicit confirmation.
- View activity; managers can administer staff, configure rewards, and correct errors.

### System

- One active loyalty account per guest per program.
- Server-enforced idempotency prevents duplicate punches.
- Privileged mutations record actor, time, location when enabled, and reason/source.
- Milestone rewards are issued once and redemption is transactional.
- Supabase Row Level Security (RLS) protects all application data.

## Provisional reward sequence

| Milestone | Reward |
|---:|---|
| 1 | Welcome visit; no redeemable reward shown |
| 2 | $25 credit |
| 3 | Complimentary IV additive |
| 4 | Complimentary NAD shot |
| 5 | Complimentary IV drip |

This interpretation of the supplied design remains provisional until eligibility, exclusions, expiration, and same-visit redemption are confirmed.

## Core rules

- Only authenticated staff can award a punch; guests cannot edit or redeem their own punches.
- A visit counts only after staff confirmation at the spa.
- One eligible visit produces at most one punch, enforced with an idempotency key.
- Rewards unlock at configured thresholds and can be redeemed only once.
- Corrections create reversal/adjustment events with a required reason; audit history is not erased.
- Program behavior after visit 5 is still undecided.

## Out of scope for MVP

- Appointment booking, payments, POS, medical records, treatment data, or clinical workflows.
- Geolocation confirmation, offline punching, native mobile apps, referrals, points, tiers, and marketing automation.

## Success and launch criteria

- Median staff punch flow completes in under 20 seconds.
- At least 95% of enrolled guests can reach the card without staff help.
- No unauthorized guest-created punches or redemptions.
- Core pages meet WCAG 2.2 AA checks and a 360 px guest viewport baseline.
- Guest progress/history are accurate; punch and redemption operations are atomic and retry-safe.
- Cross-user access is blocked by tested RLS policies.
- Loading, empty, error, conflict, and offline states are implemented.

