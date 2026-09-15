# Security baseline

- Validate every external input on the server.
- Use Better Auth sessions stored in PostgreSQL.
- Require verified server sessions for protected pages and mutations.
- Enforce `customer`, `staff` and `admin` roles server-side.
- Never trust prices, totals, stock or roles sent by the browser.
- Use database transactions and constraints for checkout.
- Store secrets only in the deployment secret manager.
- Rotate M-Pesa and storage credentials on a schedule.
- Apply rate limits to sign-in, password reset, search and payment endpoints.
- Keep password-reset responses generic, expire reset links after one hour,
  make tokens single-use and revoke existing sessions after a successful reset.
- Redact tokens, passwords and payment credentials from logs.
- Use HTTPS, secure cookies, CSRF protection and strict security headers.
- Keep an immutable audit trail for stock, payment and admin status changes.
- Back up PostgreSQL and test restoration regularly.
- Run dependency, type, lint, unit and build checks in CI.
- Add end-to-end checkout tests before accepting real payments.

Implementation and deployment instructions are maintained in the
[configuration and security runbook](configuration-security-runbook.md).

## Production launch gates

- M-Pesa sandbox and production callback reconciliation tested.
- Payment and order idempotency tests pass.
- Stock cannot become negative under concurrent checkout.
- Staff routes reject customer sessions.
- Database point-in-time recovery is enabled.
- Error monitoring and uptime alerts are active.
- Privacy policy, terms, returns and delivery policies are approved.
