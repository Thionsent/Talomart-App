# Configuration and security runbook

Last reviewed: 8 September 2026

This runbook covers Talomart's Phase 0.2 controls. Code implementation is complete enough for staging verification. Credential rotation and production activation remain operational launch gates and must be performed in the provider dashboards by an authorized owner.

## 1. Implemented controls

| Control | Code status | Production evidence still required |
|---|---|---|
| Reject missing or placeholder deployment configuration | Implemented in `apps/web/src/lib/env.ts`; runtime validation executes before traffic is accepted | Deploy each environment and deliberately test one invalid configuration |
| Separate development, staging and production configuration | Three environment templates are present; deployed URLs and M-Pesa mode are validated | Use separate provider projects/apps and encrypted secret stores |
| CSP and security headers | Per-request nonce CSP, HSTS in production, frame, MIME, referrer, permissions, COOP and CORP headers | Verify headers on the public HTTPS staging and production hosts |
| Endpoint throttling | Database-backed limits protect auth, tracking, checkout, M-Pesa and admin mutations; stale records are cleaned | Verify the selected proxy supplies the configured client-IP header |
| Administrator MFA | TOTP enrollment/challenge, backup codes, short privileged sessions and lockout are implemented | Enroll every privileged user and safely store backup codes |
| Scoped staff access | Staff has no implicit privileges; explicit catalogue, inventory, order, customer, analytics, staff and audit scopes are available | Assign least privilege and test every staff role in staging |
| Administrator audit trail | Sensitive mutations write actor, resource, before/after state, IP and user agent to an append-only table | Set retention/export ownership and review alerts |
| Dependency vulnerabilities | No known high or critical production dependency finding at the latest local audit | Run audit in CI and approve or fix future findings |

## 2. Environment isolation

Use a separate deployment, Supabase project/database, Daraja app, email key and public hostname for every environment. A staging key must not be capable of reading or mutating production data.

| Environment | Template | Data/payment rule |
|---|---|---|
| Development | `.env.development.example` | Developer-owned test data and Daraja sandbox only |
| Staging | `.env.staging.example` | Separate staging data, Daraja sandbox and non-customer email recipients |
| Production | `.env.production.example` | Production data, approved live Daraja credentials and verified sender |

Never copy a completed environment file into Git. Store runtime secrets in the hosting platform's encrypted secret manager. Give migration jobs `DATABASE_DIRECT_URL`; the web runtime normally needs only pooled `DATABASE_URL`.

Deployment order:

1. Create isolated provider projects/apps and least-privilege credentials.
2. Populate the target's encrypted secret store from the matching template.
3. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
4. Run `npm run db:migrate`, then `npm run security:check` against that target.
5. Deploy with ordering/payment traffic disabled, then smoke-test authentication, headers and authorization.
6. Enable the intended payment method only after callback and reconciliation tests pass.

## 3. Credential rotation procedure

Previously displayed, pasted, logged or prototype credentials must be treated as compromised even when they still work. Do not paste replacement values into issues, chat, documentation or terminal output.

| Credential | Rotation action | Important effect |
|---|---|---|
| `AUTH_SECRET` | Generate a unique secret of at least 48 characters per environment, store it encrypted, deploy, then remove the old value | Existing sessions, guest-order credentials and rate-limit hashes may become invalid; schedule a maintenance window |
| `DATABASE_URL` / `DATABASE_DIRECT_URL` | Change the database password or create replacement least-privilege roles, update runtime and migration jobs, verify, then revoke old access | Coordinate migration and application cutover to avoid downtime |
| `SUPABASE_SECRET_KEY` | Create a new server-only secret key, update the backend, verify Storage uploads, then revoke the exposed key | The key bypasses RLS and must never reach a browser; prefer current `sb_secret_...` keys over legacy `service_role` JWTs |
| Daraja consumer key/secret | Create/regenerate credentials for the correct sandbox or production app, deploy them, run a controlled STK test, then retire old app credentials | Keep sandbox and production apps completely separate |
| Daraja shortcode/passkey | Obtain the approved values for the target environment, update them together and verify callback/status reconciliation | Never enable production M-Pesa with sandbox values |
| `RESEND_API_KEY` | Create a domain-restricted sending key, deploy it, test password-reset delivery, then delete the exposed key | Use a verified domain and sending-only permission |

A safe rotation is create -> deploy -> verify -> revoke. Revoke first only for an active compromise where immediate containment outweighs downtime.

## 4. Verification commands

Run from the repository root without printing environment values:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run security:check
npm audit --omit=dev
```

Verify on the deployed HTTPS host:

- missing/placeholder configuration prevents startup;
- the response contains CSP, HSTS and the remaining security headers;
- repeated checkout/auth/tracking requests return `429` with `Retry-After`;
- an admin without MFA is forced through enrollment and challenge;
- a staff member without a scope receives no page or mutation access;
- sensitive admin changes appear in the audit viewer and cannot be updated/deleted;
- secrets are absent from browser bundles, HTML, responses, logs and source history.

The client-IP header must be supplied and overwritten by the trusted edge proxy. Do not trust an arbitrary browser-provided `X-Forwarded-For` value. Set `RATE_LIMIT_IP_HEADER` to the platform's authoritative header and restrict `TRUSTED_PROXY_IPS` where the platform exposes fixed proxy addresses.

## 5. Dependency finding policy

The current production audit has no known high or critical findings. Four moderate findings remain in the development-only Drizzle Kit toolchain. The package manager proposes a breaking downgrade, so do not run `npm audit fix --force`. Keep Drizzle tooling out of production images, monitor upstream releases, and review this exception before public launch. Any high or critical production finding blocks release unless a named owner documents a time-limited risk acceptance and mitigation.

## 6. Rollback and incident notes

- Preserve the last known-good deployment and secret versions until verification finishes.
- Roll application code back independently of irreversible database migrations.
- If a server credential leaks, revoke it, invalidate affected sessions where applicable, review audit/provider logs and document the incident.
- Audit events are append-only. Correct mistakes with a new compensating event, never by editing history.
- Export audit records to a separate restricted retention system before database retention or deletion policies are introduced.

## 7. Completion record

Do not mark Phase 0.2 launch-complete until the following evidence is attached to the roadmap:

- [ ] credential rotation record containing owner/date/key identifier only (never the secret);
- [ ] proof that staging cannot access production;
- [ ] staging and production header/rate-limit test output;
- [ ] privileged-account MFA enrollment list and staff permission review;
- [ ] successful `security:check`, CI and production dependency audit;
- [ ] audit-log retention/export owner and incident escalation owner.

