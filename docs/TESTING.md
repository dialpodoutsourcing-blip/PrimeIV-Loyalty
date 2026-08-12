# Testing Strategy

## Layers

- **Unit:** milestone/progress logic, expiry/status formatting, validation, permissions, and UI states.
- **Integration/database:** constraints, migrations, RLS role matrix, atomic issuance, idempotency, concurrency, and corrections.
- **End-to-end:** guest authentication/card, staff lookup/punch, redemption, denied access, responsive layouts, and safe network retries.

## Required scenarios

| Scenario | Expected result |
|---|---|
| Guest inserts a visit | Blocked by RLS |
| Staff submits the same visit twice | One event; retry returns original result |
| Two staff redeem together | One success and one conflict |
| Guest requests another account | No data/authorized error |
| Threshold is reached | Award created in the same transaction |
| Network drops after confirmation | Safe retry with no duplicate |
| Revoked staff mutates data | Denied |
| Reduced motion is enabled | No required scratch animation |

## Quality gates

- Type checking, lint, unit/integration, critical E2E, migration, and RLS tests pass.
- Automated accessibility checks are paired with keyboard and screen-reader smoke tests.
- Responsive checks cover 360 px guest and 1024/1280 px staff layouts.
- Production build validates required environment variables.
- Tests use generated accounts and deterministic seed data, never real guest data.

