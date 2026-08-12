# Technical Architecture

## Recommended shape

Use one React application with mobile-first guest routes and protected desktop staff routes. Next.js with TypeScript is the proposed Vercel-ready framework because it provides routing and trusted server handlers in one project; this is not yet a locked decision.

| Concern | Service |
|---|---|
| UI and server routes | React/Next.js on Vercel |
| Authentication | Supabase Auth |
| Relational data | Supabase Postgres |
| Authorization | Postgres RLS plus server role checks |
| Privileged mutations | Postgres functions/RPC or trusted server routes |
| Database changes | Versioned SQL migrations |
| Source and review | GitHub |
| Delivery | GitHub Actions and Vercel |

## Trust boundaries

The browser is untrusted. It reads only rows allowed by RLS and never receives the Supabase service-role key. Punches, redemptions, corrections, staff changes, and reward configuration execute as authorized server-side transactions. The public Supabase key is exposed only after every relevant table has tested RLS.

## Proposed layout

```text
app/                 guest, staff, and server routes
components/          guest, staff, and shared UI
lib/                 auth, Supabase, validation
supabase/migrations/ versioned SQL
tests/               unit, integration, and end-to-end
docs/                product and engineering decisions
```

## Transaction design

Recording a visit verifies active staff/location access, validates eligibility, inserts with a unique idempotency key, computes the milestone, issues a reward once, appends an audit event, and returns card state—all in one transaction.

Redemption atomically changes only an eligible `issued` award to `redeemed`, capturing actor, location, and time. Concurrent attempts yield one success.

## Environments and delivery

- Separate development/preview and production Supabase data; previews never use production data.
- Review ordered SQL migrations in pull requests.
- Require type checks, lint, tests, migration validation, and secret scanning.
- Keep structured server logs with correlation IDs but no OTPs or sensitive profile data.
- Test backups/restores before launch and monitor auth, database, and mutation failures.

## Performance targets

- Guest card usable within 2.5 seconds at p75 on a typical mobile connection.
- Staff lookup within 1 second under normal load.
- Mutations produce definitive, retry-safe results.
- Cache only non-sensitive static assets and minimize client JavaScript.

