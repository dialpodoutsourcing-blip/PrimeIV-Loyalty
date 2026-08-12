# Open Questions and Decision Log

Resolve these before treating the schema or UI behavior as final.

## Business questions

1. Is the welcome visit earned through a real visit or granted automatically?
2. Is a reward available immediately after its named visit, including on that same visit?
3. Does redemption affect progress, or consume only the reward?
4. After visit 5, does the card restart, stop, or begin another cycle?
5. Do rewards expire, and after how many days?
6. What exclusions, substitutions, stacking, taxes, and service-value rules apply?
7. What qualifies as an actual visit: check-in, completed paid service, or another event?
8. Can multiple visits count on one calendar day?
9. Is launch single-location or multi-location, and can rewards cross locations?
10. Which roles can reverse punches, void awards, or correct redemptions?
11. Can guests self-enroll, or must staff initiate it?
12. Is email enough for MVP, or is phone/SMS required?

## Brand/content needed

- Official SVG/transparent logo, usage rules, colors, and fonts/licensing.
- Approved reward names, terms, expiry copy, program name, and support contact.
- Approval on whether a scratch/reveal animation is wanted.

## Technical decisions

| Decision | Proposed default | Status |
|---|---|---|
| React framework | Next.js with TypeScript | Proposed |
| Guest auth | Supabase email magic link/OTP | Proposed |
| Staff auth | Supabase Auth with MFA | Proposed |
| Privileged writes | Transactional Postgres functions called server-side | Proposed |
| Styling | CSS variables plus lightweight components | Open |
| QR format | Short-lived signed code plus manual fallback | Proposed |
| Monitoring/analytics | Privacy-conscious providers | Open |

Record approved decisions with date, decision, reason, consequences, and owner.

