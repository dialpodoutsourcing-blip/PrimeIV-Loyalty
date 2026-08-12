# User Journeys and Rules

## Guest enrollment

1. Staff asks for the guest's email and obtains appropriate consent.
2. The account is created or matched without exposing unrelated accounts.
3. The guest receives a passwordless sign-in link and reviews loyalty terms.
4. The loyalty card opens with current progress.

Account merging is manager-assisted and never automatic.

## Guest checks progress

1. Guest opens the app on a phone.
2. Home shows completed visits, the next milestone, and available rewards.
3. Guest can open reward terms, history, or a short-lived QR/member code.

Scratch/reveal motion is optional enhancement only; it cannot hide important information and must respect reduced-motion preferences.

## Staff awards a punch

1. Staff signs in on desktop and scans/searches for the guest.
2. Staff verifies limited identifying details and selects **Record visit**.
3. Confirmation shows the guest, resulting visit number, and unlocked reward.
4. A server transaction records the event and any award.
5. Staff and guest views show the updated state.

Retries use the same idempotency key. A concurrent or repeated request cannot add a duplicate punch.

## Staff redeems a reward

1. Staff opens the verified guest record and chooses an eligible reward.
2. A confirmation displays its terms and guest identity.
3. A transaction changes `issued` to `redeemed` and records actor/location/time.
4. A receipt-like success state confirms the result.

## Manager correction

1. Manager finds the event, selects a permitted correction, and enters a reason.
2. The system previews impact on progress and unredeemed rewards.
3. Confirmation adds a compensating event; it never erases history.

Redeemed rewards are not automatically undone and require explicit resolution.

## Exceptional states

- No account: staff may begin enrollment with consent.
- Duplicate identity: stop and route to a manager; do not guess or auto-merge.
- Network interruption: retry with the same key; never optimistically show a completed punch.
- Expired reward: show it unavailable with its expiration date.
- Suspended staff: block privileged operations immediately.
- Concurrent redemption: only the first transaction succeeds.
- Completed card: follow the configured repeat/stop policy once decided.

