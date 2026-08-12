# Prime IV Loyalty Punch Card

A digital loyalty card for Prime IV Hydration & Wellness. Guests earn one verified punch for each in-person spa visit and unlock a sequence of rewards. The guest experience is mobile-first; the staff workspace is desktop-only.

This repository currently contains the product and engineering plan. Implementation has not started.

## Product snapshot

- Guest: view card progress, available rewards, and reward history on a phone.
- Staff: find a guest, verify an actual visit, issue one punch, and redeem eligible rewards.
- Concept rewards: welcome visit, `$25 credit`, complimentary IV additive, complimentary NAD shot, and complimentary IV drip.
- Stack: React, Supabase (Postgres and Auth), Vercel, GitHub, and SQL migrations.

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [User journeys](docs/USER_FLOWS.md)
- [UX and brand direction](docs/UX_UI.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE.md)
- [Security and privacy](docs/SECURITY.md)
- [Testing strategy](docs/TESTING.md)
- [Delivery roadmap](docs/ROADMAP.md)
- [Open questions](docs/DECISIONS.md)

## Working principles

1. A punch represents a staff-verified, real-world visit.
2. Punch creation and reward redemption are privileged server-side operations.
3. Corrections are recorded rather than silently deleting history.
4. Guest UI starts with small screens; staff UI targets desktop workflows.
5. Rewards are data-driven so the program can change without redesigning the app.

