# Database Design

## Goals

Postgres is authoritative; visit/redemption history is auditable; constraints backstop app validation; program configuration is data-driven; personal data is minimized.

## Proposed entities

| Table | Purpose | Key fields |
|---|---|---|
| `profiles` | Profile linked to Supabase Auth | `id`, `display_name`, `member_code`, timestamps |
| `locations` | Spa locations | `id`, `name`, `timezone`, `active` |
| `staff_memberships` | Staff/admin access | `user_id`, `location_id`, `role`, `active` |
| `loyalty_programs` | Versioned program | `id`, dates, `repeat_policy`, `active` |
| `reward_definitions` | Milestone configuration | `program_id`, `visit_threshold`, `name`, `terms`, `valid_days` |
| `loyalty_accounts` | Guest enrollment/cycle | `profile_id`, `program_id`, `cycle`, `status` |
| `visit_events` | Verified punch ledger | account/location/actor, idempotency, occurrence, reversal |
| `reward_awards` | Issued reward | definition/source/status/expiry/redemption fields |
| `audit_events` | Privileged action trail | actor/action/entity/metadata/time |

Avoid copying email/phone into `profiles` unless required; Supabase Auth should remain the identity source where practical.

## Constraints

- Profile ID references `auth.users`; member code is unique, random, and non-sequential.
- One account per `(profile_id, program_id, cycle)`.
- One definition per `(program_id, visit_threshold)` unless multiple milestone rewards are approved.
- Visit `idempotency_key` is unique; reversals reference original events.
- One award per `(account_id, reward_definition_id, cycle)`.
- Award statuses are checked values such as `issued`, `redeemed`, `expired`, and `voided`.
- Redemption fields must agree with status.

Progress equals valid visit events minus reversals for the current cycle. A cached count may be added, but the event ledger remains authoritative. Reward issuance occurs in the qualifying visit transaction.

## RLS outline

- Guests read only their own profile, accounts, visits, awards, and public program definitions.
- Guests cannot create or change visits, awards, staff access, configuration, or audits.
- Staff read guest loyalty details only through approved, scoped lookup paths and execute controlled visit/redemption functions.
- Managers receive only explicit role/location capabilities; corrections are audited functions.

## Migration rules

- Every change is a forward SQL migration under `supabase/migrations`.
- Include constraints, indexes, RLS enablement, policies, grants, and comments.
- Prefer additive/backward-compatible production changes.
- Seed data is deterministic and contains no real personal data.
- Test migrations from empty and production-like databases.

Index member code, account ownership/status, account event time, award status/expiry, active staff membership, and audit entity/time. Final DDL follows approval of the business questions.

