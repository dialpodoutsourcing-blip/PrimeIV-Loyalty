# Security and Privacy

## Scope and classification

Store only identity/contact details, loyalty activity, staff access, and audit metadata needed by this program. Do not store medical histories, diagnoses, treatment notes, prescriptions, or clinical records. Any future protected-health-information scope requires a separate legal/compliance and architecture review.

## Authentication and authorization

- Guests use verified passwordless email initially with strict redirect allowlists.
- Staff use a separate protected route, strong authentication, and MFA before production.
- Staff access is explicitly provisioned, location-scoped, reviewable, and revocable.
- Deny by default with RLS on every exposed table; UI visibility is never authorization.
- Verify role and location inside each privileged transaction.
- Service-role credentials stay in trusted server environments only.
- Test horizontal isolation between guests and vertical isolation between roles.

## Abuse controls

- Random member codes identify but do not authenticate.
- Use short-lived signed QR payloads if QR is enabled.
- Enforce idempotency and database uniqueness for visits.
- Rate-limit authentication, lookup, punch, and redemption endpoints.
- Require confirmations for high-impact actions and preserve manager-visible audits.

## Secrets, privacy, and operations

- Keep secrets in Supabase/Vercel settings, never Git; later commit `.env.example` with names only.
- Separate development/preview/production credentials and restrict production deploy/migration access.
- Define retention, verified export/deletion handling, privacy notice, program terms, and vendor responsibilities.
- Redact personal fields from logs, analytics, screenshots, and broad search results.
- Test backups/restoration, staff offboarding, rate limits, secret scanning, RLS, and incident response before launch.

