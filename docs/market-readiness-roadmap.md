# Talomart implementation and market-readiness roadmap

Last reviewed: 20 August 2026  
Target market: Kenya  
Canonical status document: **Yes**  
Current release recommendation: **Do not open unrestricted public ordering yet. Complete Phase 0, run a controlled pilot, then hold a public-launch go/no-go review.**

## 1. Purpose and status rules

This document consolidates the earlier implementation phase plan and the market-readiness roadmap. It is now the single source of truth for:

- what Talomart has already implemented;
- what is partially implemented;
- what must be completed before accepting unrestricted public orders;
- what should be tested during a controlled pilot; and
- which growth features should wait until after a stable launch.

The older phase snapshots contained conflicting statuses. For example, some sections marked the admin console, M-Pesa flow, order success page and tracking page as pending even though they are now implemented. Those snapshots are superseded by this document.

Status meanings:

| Status | Meaning |
|---|---|
| Complete | Implemented and verified locally at the level stated |
| Partial | Useful implementation exists, but required behaviour or production verification remains |
| Not started | No material implementation was found |
| Deferred | Intentionally excluded from the initial launch |
| Launch-gate complete | Verified in the deployed production-like environment with evidence |

`Complete` does not automatically mean `launch-gate complete`. A feature can work locally and still require production configuration, security review, operational ownership or deployment evidence.

## 2. Executive status

Talomart is a **strong internal beta** with a working end-to-end commerce foundation. It is no longer just a storefront prototype.

The application currently includes:

- a responsive storefront and product catalogue;
- database-backed cart and wishlist behaviour;
- customer and administrator authentication;
- guest and authenticated checkout foundations;
- cash on delivery;
- a working Daraja M-Pesa sandbox STK Push and callback flow;
- transactional order creation and inventory reservation;
- a substantial administrator operations console;
- customer account statistics and order history;
- order confirmation and tracking interfaces; and
- unit-level automated tests, type checking, linting and successful production builds.

It is **not ready for unrestricted public launch** because production M-Pesa onboarding, customer communications, monitoring, backups, operational processes, legal review and release-level testing remain incomplete.

## 3. Consolidated implementation inventory

### 3.1 Foundation, storefront and data

| Capability | Status | Current implementation | Remaining work |
|---|---|---|---|
| Brand and UI foundation | Complete | Responsive Talomart interface using the green, navy and orange brand system | Production accessibility and performance verification |
| Application architecture | Complete | TypeScript monorepo with Next.js web, database, shared UI and optional worker packages | Document deployment topology and decide whether the worker is needed at launch |
| Supabase PostgreSQL model | Complete | Users, sessions, catalogue, carts, wishlists, orders, checkout sessions, payments, fulfilments, inventory movements, notification events and reviews | Production project, advisor review, backup and restore evidence |
| Migrations and seed data | Complete | Versioned migrations and starter catalogue scripts exist | Production migration runbook and release ownership |
| Storefront routes | Complete | Homepage, products, categories, product detail, search and offers | Final catalogue content, SEO data and merchandising review |
| Cart | Complete | Add, update and remove flows with opaque guest/customer-scoped browser storage and cookies; one-time guest migration on authentication | Browser E2E and concurrency verification |
| Wishlist | Complete | Database-backed customer wishlists with isolated guest and per-customer browser caches; guest favourites never leak into an account | Browser E2E verification across guest, multiple customers and logout transitions |
| Product images | Complete in code | Supabase Storage upload support for product and category images | Verify bucket policies, limits and production upload behaviour |

### 3.2 Authentication and customer account

| Capability | Status | Current implementation | Remaining work |
|---|---|---|---|
| Customer authentication | Complete | Sign-up, sign-in, session handling and protected account route | Production origin/cookie verification, rate limits and E2E tests |
| Administrator authentication | Complete in code | Separate administrator auth route/cookies, server-side roles, TOTP MFA enrollment/challenge and shorter privileged sessions | Enroll all privileged accounts and verify recovery/offboarding in staging |
| Password reset | Partial | Request/reset pages and Resend email foundation | Production API key, verified sender/domain, delivery/bounce monitoring and E2E test |
| Customer account dashboard | Complete for current scope | Total orders, lifetime spend, saved products and order history | Profile editing, saved addresses, account data controls and help actions |
| Reorder/support shortcuts | Deferred | Not required for initial pilot | Add after core support and fulfilment processes are stable |

### 3.3 Checkout, orders and payments

| Capability | Status | Current implementation | Remaining work |
|---|---|---|---|
| Checkout UI and validation | Complete | Delivery details, COD/M-Pesa choice and server-side validation | Full browser and accessibility testing |
| Authoritative totals | Complete | Server reloads product pricing and availability rather than trusting browser totals | Promotions/tax rules when introduced |
| Order and inventory transaction | Complete | Order creation and inventory reservation are transactional | Concurrent last-unit and rollback integration tests |
| Checkout idempotency | Complete in code | Checkout idempotency keys and repeated-request handling are implemented | Prove simultaneous/retry behaviour with integration tests and define cleanup retention |
| Cash on delivery | Complete | COD order creation and admin payment confirmation exist | Pilot fulfilment and cash-reconciliation procedure |
| M-Pesa sandbox STK Push | Complete | Daraja sandbox prompt, checkout request handling and low-value successful payment verified | Keep sandbox/staging credentials isolated and rotate previously shared credentials |
| M-Pesa callback reconciliation | Complete in code | Callback serialization, replay protection, payment reconciliation, late-success recovery and order update exist | Production callback verification, out-of-order integration tests and monitoring |
| Pending-payment experience | Complete in code | Separate processing/confirmed/failed/expired states, 45-second prompt timeout, automatic Daraja queries and safe STK resend | Staging browser E2E, provider edge-case monitoring and support escalation |
| M-Pesa abandonment | Complete in code and locally verified | Ten-minute expiry, idempotent cancellation and exact active-reservation release; status polling and new checkout traffic run cleanup | Add a production scheduler so cleanup does not depend on customer or checkout traffic |
| M-Pesa production | Not started operationally | Sandbox implementation provides the foundation | Daraja production approval, live credentials, shortcode/passkey, public HTTPS callback and live low-value test |
| Refunds and disputes | Not started | No complete operational workflow | State model, permissions, audit evidence, customer messages and finance reconciliation |

### 3.4 Administrator operations console

The earlier plan's “Admin Operations Console” phase is now substantially complete.

| Capability | Status | Notes |
|---|---|---|
| Responsive administrator layout | Complete | Separate sign-in, sidebar and mobile navigation |
| Overview dashboard and analytics | Complete | Operational totals and charts |
| Product CRUD | Complete | Create, edit and manage catalogue products |
| Category CRUD | Complete | Create, edit and manage categories |
| Product/category image upload | Complete in code | Supabase Storage-backed uploads |
| Bulk catalogue import/export | Complete | Template, export and bulk update workflow |
| Product/order search and filters | Complete | Operational filtering and sorting controls |
| Inventory controls | Complete | Adjustments, low-stock view and movement history |
| Order management | Complete | Status changes, cancellation and payment updates |
| Fulfilment management | Complete | Courier, tracking number, status, notes and history |
| Printable invoice | Complete | Dedicated printable route |
| Packing slip/picking list | Complete | Dedicated printable route |
| Customer module | Complete for current scope | Customer list, order history, lifetime value and segments |
| Notification event visibility | Partial | Events appear in order administration | No central inbox, assignment, read/unread workflow or outbound delivery monitoring |
| Staff permissions | Complete in code | Staff has explicit catalogue, inventory, order, customer, analytics, staff and audit scopes with no implicit access | Assign least privilege and rehearse user management/offboarding |
| Administrator audit log | Complete in code | Sensitive mutations record actor, resource, before/after state, IP and user agent; database trigger rejects update/delete | Define retention/export ownership and verify deployed events |

### 3.5 Post-purchase experience and communication

| Capability | Status | Current implementation | Remaining work |
|---|---|---|---|
| Order success page | Complete in code | Account ownership or expiring HttpOnly guest credential, generic denials, minimized delivery data and private/no-index responses | Verify the complete flow in staging |
| Tracking page | Complete in code | Authorized status timeline with no recipient/phone/location/total exposure and a PostgreSQL-backed lookup limiter | Verify trusted client-IP headers and limiter behaviour on the selected host |
| Notification event records | Complete | Order/payment events can be persisted and viewed in admin context | Durable outbound delivery and deduplication verification |
| Transactional email | Complete in code; operational verification pending | Durable password-reset, order, payment, dispatch, delivery, cancellation and refund email with idempotent retries and signed delivery webhooks | Verify the sending domain, configure environment secrets/scheduler, and pass staging delivery/bounce tests |
| SMS/WhatsApp | Deferred for pilot unless required | No production delivery integration | Add only after provider, consent, cost and support ownership are agreed |
| Administrator notification inbox | Not started | Order-level events exist | Central inbox, priority, assignment and read/unread behaviour |
| Customer support content | Partial | Privacy and terms routes exist | Help, contact, returns, shipping, warranty, payments and about routes |

### 3.6 Platform, quality and operations

| Capability | Status | Current implementation | Remaining work |
|---|---|---|---|
| Validation and authorization baseline | Complete in code | Zod validation, server-side roles/scopes, safe redirects, protected order access and shared database throttles for auth, tracking, checkout, M-Pesa and admin mutations | Production proxy verification and browser/integration authorization tests |
| Security headers | Complete in code | Nonce-based CSP, production HSTS, frame, MIME, referrer, permissions, COOP and CORP headers with unit coverage | Verify the final policy and headers on deployed HTTPS hosts |
| Background jobs | Partial scaffold | BullMQ setup, retry options and graceful shutdown | Implement durable payment/notification jobs or omit worker from initial deployment |
| SEO | Partial | Global metadata and Open Graph foundation | Sitemap, robots, canonicals, product structured data and final metadata |
| Analytics | Partial | Admin analytics exist | Privacy-conscious acquisition/checkout events, consent decision and ownership |
| Automated tests | Partial | Unit and utility coverage exists | Browser E2E, authorization, callback integration, concurrency, accessibility, performance and load tests |
| CI/build quality | Complete locally | Typecheck, lint, tests and production build pass | Enforce in hosted CI and add dependency/security scanning |
| Deployment | Not started | Local development environment works | Staging, production, domain, TLS, secret manager, release and rollback process |
| Monitoring | Not started | Basic liveness endpoint only | Error tracking, logs, uptime, payment/business alerts and dependency-aware readiness |
| Backups and recovery | Not started operationally | Supabase is the database provider | Non-pausing plan, automatic backups and completed restore drill |
| Legal/tax readiness | Not started | Generic privacy/terms foundation | Kenyan legal review, ODPC decision, consumer-policy approval and KRA/eTIMS process |

## 4. Current verification snapshot

Verification performed on 20 August 2026 against the `production-rebuild` branch:

- TypeScript type checking: **passed** for all workspaces.
- Automated tests: **62 passed** across the web and worker packages.
- Lint: **passed with zero errors** and four unused-parameter warnings in `auth-actions.ts`.
- Production build: **passed**, including all application routes and the worker TypeScript build.
- Live database check: **passed**, returning 6 categories and 9 products. Local development now prefers the configured session/direct pool URL while production continues to use the transaction pool URL.
- Payment abandonment smoke test: **passed** using phantom sandbox order `TLM-20260820-137598AA`; the first expiry cancelled the order and recorded one release, and a repeated expiry made no second change.

The working tree contains many modified and untracked files. Before the next large feature phase, review and divide the current implementation into focused commits. Do not include the old `Talomart Ecommerce` prototype, local environment files or secrets in a production commit.

## 5. Phase 0 — mandatory work before a controlled pilot

Every Phase 0 item is mandatory unless a written launch decision disables the affected capability.

### 0.1 Protect customer order information — critical

Current state: **Complete in code and locally verified; ready for staging verification**.

Order success and tracking currently locate an order using its order number. An order number must never be treated as an authorization credential.

Implemented controls:

- For authenticated orders, require the active customer's user ID to match the order owner.
- For guest orders, create a high-entropy, order-specific access token and store only what is necessary to validate it.
- Prefer a secure, `HttpOnly`, `SameSite` cookie or carefully designed expiring signed link.
- Return the same generic result for absent and unauthorized orders.
- Minimize displayed personal data, especially full addresses and phone numbers.
- Add no-index and private/no-store cache behaviour.
- Apply distributed rate limits to tracking attempts.
- Automated tests cover ownership, guest-token validation, expiry, cookie naming and limiter boundaries.
- Live local smoke tests verify authorized guest access, anonymous denial, data minimization and rate-limit enforcement.

Remaining staging verification:

- Confirm the production host supplies a trusted, non-spoofable client-IP header to the application.
- Verify guest checkout, signed-in ownership, private cache headers and limiter behaviour on the deployed staging URL.

Acceptance criteria:

- [x] A visitor with only an order number cannot view order details.
- [x] A signed-in customer cannot view another customer's order.
- [x] A guest credential grants access only to its associated order.
- [x] Invalid access does not reveal whether an order exists.
- [x] Customer pages expose only the minimum required personal data.
- [ ] The controls have passed staging verification using the selected host's trusted proxy headers.

### 0.2 Harden production configuration and application security

Current state: **Code hardening complete; credential rotation and deployed verification remain operational launch gates**.

Implemented:

- Production/staging runtime rejects missing, placeholder, local or unsafe configuration.
- Separate development, staging and production templates document environment boundaries.
- Database-backed endpoint limits cover sign-in, sign-up, reset, tracking, checkout, M-Pesa and administrator mutations.
- A per-request nonce Content Security Policy and stronger security headers are applied.
- Privileged users require TOTP MFA; staff access is explicit and scoped.
- Sensitive administrator mutations produce immutable audit records.
- The production dependency audit has no known high or critical finding; a development-only moderate exception is documented.

Operational work:

- Rotate database, Supabase, authentication, email and M-Pesa credentials that originated in the prototype or were shared outside the secret manager.
- Create isolated staging and production provider projects/apps and encrypted secret stores.
- Enroll every privileged account in MFA, assign least privilege and rehearse recovery/offboarding.
- Verify the CSP, headers, proxy-derived client IP, rate limits and audit records on deployed HTTPS hosts.
- Configure audit retention/export and incident ownership.
- Follow [the configuration and security runbook](configuration-security-runbook.md).

Acceptance criteria:

- [x] Production refuses to boot with placeholder or incomplete configuration in code/tests.
- [ ] No secret is present in Git, documentation, logs or client bundles.
- [ ] Staging credentials cannot access production data.
- [ ] Security headers and shared rate limits work on the deployed HTTPS site.
- [ ] Admin MFA, scoped permissions and audit events are activated and verified for every privileged production account.
- [x] No known unaccepted high or critical production dependency/security finding remains locally.

### 0.3 Complete the payment lifecycle

Current state: **Sandbox customer recovery flow is complete in code and locally verified; production onboarding and operations remain incomplete**.

Implemented in this phase:

- Persist an attempt count, last-initiation time, last Daraja-query time and normalized provider-query state.
- Query Daraja automatically while the customer is on the payment-processing screen, with a database-backed query cooldown.
- Keep accepted STK requests in a distinct processing state until provider confirmation; never label an unconfirmed M-Pesa order successful.
- Show “Prompt not received?” after the 45-second sandbox-safe timeout when Daraja confirms that the request does not exist.
- Permit a maximum of three STK attempts, with a resend cooldown and no resend while the previous provider request is still processing.
- Keep stock reserved during the recovery window instead of cancelling immediately after a failed callback.
- Cancel abandoned requests after ten minutes and release only the active order reservation, exactly once.
- Reconcile a successful Daraja status query even when the callback is missing, including late-success inventory recovery.

Required work:

- Finish Daraja production onboarding or hide M-Pesa and pilot with COD only.
- Store live credentials in the production secret manager.
- Verify the public HTTPS callback and complete the smallest safe live transaction.
- Extend state-transition coverage with database-backed concurrent, duplicate, delayed and out-of-order callback integration tests.
- Add a production scheduler for abandonment sweeps so cleanup runs even with no customer or checkout traffic.
- Add scheduled/operator reconciliation for unresolved transactions after the customer polling window.
- Provide safe administrator visibility into payments requiring attention.
- Define cancellation, refund, dispute and finance-reconciliation procedures.
- Alert on repeated STK Push, callback or reconciliation failures.

Acceptance criteria:

- [ ] Every visible payment method works in its deployed environment.
- [ ] Duplicate callbacks produce no duplicate state change or notification.
- [ ] Concurrent retries produce one order, payment and inventory reservation.
- [x] Abandoned orders release stock exactly once after the approved timeout in local verification.
- [ ] Provider/database mismatches are identified and owned daily.
- [ ] Support can locate a payment by order number, checkout request ID or receipt number.
- [ ] Refund/cancellation procedures have been tested by operations.

See [M-Pesa production readiness](mpesa-production-readiness.md) for the integration-specific checklist.

### 0.4 Complete customer communication

Current state: **Complete in code; provider configuration and staging verification remain**.

Implemented:

- Password-reset delivery uses provider idempotency and records send failures without storing the reset token.
- Checkout captures a receipt email and snapshots order confirmation content in the same transaction as the order.
- Payment confirmation/failure, dispatch, delivery, cancellation and refund transitions enqueue customer email.
- A database unique key and Resend idempotency key prevent duplicate messages during application and provider retries.
- A signed webhook ingests delivered, delayed, bounced, failed, complained and suppressed outcomes idempotently.
- Exponential-backoff retries, a protected scheduler endpoint and an administrator delivery dashboard are available.

Operational work:

- Configure a verified transactional email domain and sender.
- Register the signed delivery webhook and protected retry scheduler on the deployed host.
- Use the public HTTPS URL in links.
- Publish real support contact details in every customer-facing template.
- Keep marketing consent and messages separate from transactional communication.
- Follow [the transactional email runbook](transactional-email.md).

Acceptance criteria:

- [ ] Password-reset links arrive, work once and expire correctly.
- [ ] Each critical order state sends at most one intended message.
- [ ] Delivery failures are visible and actionable.
- [ ] Templates render correctly on common mobile clients.

### 0.5 Publish support, trust and policy content

Current state: **Incomplete; some footer destinations return 404 and placeholders remain**.

Create and approve:

- `/help`
- `/contact`
- `/returns`
- `/shipping`
- `/warranty`
- `/payments`
- `/about`

Replace placeholder telephone numbers, sender addresses, social-media links and app-store links. Hide any link that is not ready.

Publish accurate delivery coverage, fees, timing, return eligibility, refund timing, warranty handling, payment guidance, business identity, support hours and escalation expectations.

Acceptance criteria:

- [ ] No visible navigation/footer link leads to a placeholder or 404.
- [ ] Support telephone, email and hours are real and staffed.
- [ ] Checkout messaging matches actual payment, delivery, return and refund processes.
- [ ] Privacy, terms and commerce policies have business/legal approval.

### 0.6 Establish production infrastructure and recovery

Current state: **Not started operationally**.

Required work:

- Create separate staging and production environments.
- Use a production Supabase plan that will not pause for inactivity.
- Configure custom domain, TLS, encrypted secrets and controlled migrations.
- Add centralized error tracking, structured logs and uptime monitoring.
- Separate liveness from database/payment-aware readiness.
- Alert on application errors, checkout failures, payment mismatch, low stock and job failure.
- Configure backups and complete a documented restore drill.
- Document application/database rollback and incident response.
- Implement required worker jobs or exclude the worker from deployment.

Acceptance criteria:

- [ ] Staging cannot read or mutate production data.
- [ ] Deployment and rollback have been rehearsed.
- [ ] Readiness becomes unhealthy when a critical dependency is unavailable.
- [ ] A backup has been restored and validated in a safe environment.
- [ ] Alerts reach a named owner and include a tested escalation path.

### 0.7 Complete release-level testing

Current state: **Unit quality gates pass; release coverage is incomplete**.

Add automated or documented tests for:

- customer registration, sign-in and password reset;
- guest and signed-in cart/wishlist behaviour;
- COD and M-Pesa checkout;
- timeout, cancellation, failure, delayed callback and duplicate callback;
- two customers attempting to buy the final stock unit;
- checkout retry and transaction rollback;
- customer/order authorization boundaries;
- administrator product, inventory, payment, order and fulfilment workflows;
- accessibility, responsive layouts and keyboard use;
- performance budgets, Core Web Vitals and realistic load; and
- staging smoke tests after deployment.

Acceptance criteria:

- [ ] Hosted CI blocks merge/deployment on typecheck, lint, unit, integration, E2E and build failure.
- [ ] Critical buyer and administrator journeys pass against staging.
- [ ] Authorization and last-unit concurrency tests pass.
- [ ] Approved accessibility, performance and load thresholds are met.

### 0.8 Complete business, fulfilment and compliance readiness

Current state: **Not launch-verified**.

Required work:

- Replace demonstration products, prices, stock, images and descriptions with approved catalogue data.
- Define delivery areas, courier handoff, proof of delivery and service levels.
- Document stock shortage, failed delivery, cancellation, return, exchange and refund processes.
- Assign daily order, payment, inventory and customer-support ownership.
- Review Kenyan privacy/data-protection obligations and confirm ODPC registration requirements.
- Review consumer, return, refund, warranty and payment policies with qualified advisers.
- Confirm the KRA/eTIMS invoicing and accounting process.
- Define data retention, deletion, data-subject requests and breach response.

Acceptance criteria:

- [ ] Catalogue, pricing and stock have accountable business owners.
- [ ] A test order can be fulfilled, delivered, returned and refunded without editing the database manually.
- [ ] ODPC, consumer-law and eTIMS decisions are documented and operational.
- [ ] Courier, support, finance and engineering escalation owners are named.

Useful official references:

- [ODPC registration and compliance FAQ](https://www.odpc.go.ke/faqs/)
- [Kenya Consumer Protection Act](https://new.kenyalaw.org/akn/ke/act/2012/46/eng%402022-12-31)
- [KRA eTIMS](https://www.kra.go.ke/online-services/etims)

## 6. Phase 1 — controlled pilot

Start with a limited catalogue, small customer group and supervised operating hours. Prefer low-value orders and keep an immediate disable switch for any payment method that becomes unreliable.

During the pilot:

- reconcile every order, payment and inventory movement daily;
- confirm customers receive all promised communications;
- fulfil orders without manual database edits;
- test cancellation, refund, failed-delivery and return procedures;
- monitor application errors, payment latency, callback failures and support cases;
- compare physical and system stock; and
- record every incident, owner, resolution and required prevention.

Pilot exit criteria:

- [ ] No unauthorized order-data access or critical security incident.
- [ ] No duplicate order or double inventory reservation from retries.
- [ ] No unexplained paid order remains unreconciled at the end of the operating day.
- [ ] Orders progress through fulfilment using documented tools and processes.
- [ ] Customers receive required transactional messages.
- [ ] Support completes cancellation, return and refund scenarios safely.
- [ ] Inventory variance is investigated and resolved.
- [ ] All pilot critical/high incidents are fixed and retested.

## 7. Phase 2 — public launch preparation

After the controlled pilot:

- fix and retest all critical/high incidents;
- address repeated customer questions through product and policy content;
- tune database indexes using measured query evidence;
- verify accessibility and performance against approved targets;
- publish sitemap, robots, canonical URLs and product structured data;
- add privacy-conscious commerce funnel analytics;
- prepare launch-day staffing, dashboards and rollback authority; and
- conduct a documented engineering, operations, finance and business go/no-go review.

## 8. Phase 3 — post-launch product roadmap

These capabilities are valuable but must not delay a secure initial launch.

### Catalogue and merchandising

- Brands and product tags
- Product variants, per-variant SKU and barcode
- Related products and visibility scheduling
- Rich product SEO controls
- Drag-and-drop category ordering
- Homepage banner and content manager
- Featured products/categories controls

### Promotions and growth

- Coupon and discount-rule manager
- Flash deals
- Abandoned-cart tracking and recovery
- Reviews and moderation
- Personalized recommendations
- Loyalty and referral programs

### Analytics and finance

- Extended revenue and sales reporting
- Cost price, cost of goods sold and gross profit
- Low-stock value and payment-method reports
- Cancellation, return and refund analysis
- Acquisition and conversion-funnel reporting

### Fulfilment and support

- Courier API integrations and label generation
- Automatic delivery-status synchronization
- Customer notes and support tickets
- Order-linked support conversations
- Advanced customer segments and CRM workflows
- SMS/WhatsApp updates where justified

### Long-term platform options

- External search only when catalogue/search evidence requires it
- Native mobile applications
- Automated eTIMS integration if portal/manual handling is insufficient
- Multi-vendor marketplace capabilities
- Service extraction or microservices only when scale and ownership justify them

## 9. Features and placeholders to remove, hide or defer before launch

- Hide M-Pesa unless live production payment processing is fully ready.
- Remove placeholder telephone numbers, addresses and email senders.
- Remove or hide placeholder social-media and app-store links.
- Hide customer-information links until their routes and approved content exist.
- Disable development catalogue/database fallbacks in production.
- Do not deploy the worker while its handlers only log intended work.
- Do not grant all staff full administrator permissions for convenience.
- Do not expose provider responses, stack traces or implementation errors to customers.
- Do not introduce Redis, microservices, external search or native applications without a measured need.
- Keep the old `Talomart Ecommerce` prototype out of release commits and deployments.

## 10. Ownership tracker

Assign a named person before starting each remaining workstream. A small team may give one person several roles, but responsibility and escalation must remain explicit.

| Workstream | Suggested owner | Current status | Evidence/link |
|---|---|---|---|
| Order access privacy | Engineering | Ready for verification | Migration 0006; 10 new access/rate-limit tests; local HTTP smoke test |
| Production environment and secrets | Engineering/DevOps | Ready for operational verification | Environment validation/templates and configuration-security runbook |
| M-Pesa production and reconciliation | Engineering + Finance/Operations | Partial | Sandbox payment verified |
| Payment expiry/refunds | Engineering + Finance/Operations | Not started | |
| Admin permissions, MFA and audit | Engineering + Operations | Ready for verification | Scoped permissions, TOTP MFA, append-only audit schema and `npm run security:check` |
| Customer email and support channels | Engineering + Customer Support | Partial | |
| Support pages and trust content | Business + Support | Partial | |
| Hosting, Supabase and backups | Engineering/DevOps | Not started | |
| Monitoring and incident response | Engineering + Operations | Not started | |
| E2E, security, accessibility and performance QA | Engineering/QA | Partial | 89 automated tests; typecheck, lint and production build pass locally |
| Catalogue and fulfilment readiness | Commerce + Operations | Not launch-verified | |
| Privacy and consumer compliance | Business + Kenyan legal adviser | Not started | |
| eTIMS and accounting | Finance/Tax adviser | Not started | |
| Controlled pilot | Product/Business owner | Not started | |

Allowed tracker statuses: `Not started`, `In progress`, `Blocked`, `Ready for verification`, `Complete`, `Deferred by launch decision`.

## 11. Public-launch go/no-go checklist

Public ordering may be enabled only when every mandatory item is checked or an explicit signed launch decision disables the relevant feature.

### Security and privacy

- [ ] Order success and tracking require valid customer ownership or guest authorization.
- [ ] Production secrets are rotated and stored in the deployment secret manager.
- [ ] Production rejects placeholder and development configuration.
- [ ] Security headers and distributed endpoint rate limits are deployed and tested.
- [ ] Administrator MFA, permission boundaries and immutable audit records are active.
- [ ] Privacy, retention, breach and incident-response procedures are approved.

### Orders, payments and inventory

- [ ] Checkout retry and concurrent-inventory tests pass.
- [ ] Payment callbacks and side effects are replay-safe under integration testing.
- [ ] Pending-payment expiry and stock release are active.
- [ ] Reconciliation, cancellation, refund and dispute procedures are tested.
- [ ] Every displayed payment method works in production.
- [ ] COD cash collection/reconciliation has an assigned owner.

### Customer and operational readiness

- [ ] Real support contacts and operating hours are published.
- [ ] Help, contact, returns, shipping, warranty, payment and about pages work.
- [ ] Privacy, terms and commerce policies are approved.
- [ ] Password-reset and order-status messages deliver reliably.
- [ ] Catalogue, prices, stock, delivery coverage and fees are accurate.
- [ ] Fulfilment, failed-delivery, return and refund processes have passed rehearsal.

### Reliability and release

- [ ] Production dependencies have no unaccepted high or critical findings.
- [ ] Hosted typecheck, lint, unit, integration, E2E and production-build gates pass.
- [ ] Staging accessibility, performance and load checks meet approved thresholds.
- [ ] Monitoring, alerts, dashboards and incident ownership are active.
- [ ] Production database availability, backups and restore evidence are confirmed.
- [ ] Deployment and rollback procedures have been rehearsed.
- [ ] Controlled pilot exit criteria are satisfied.

### Business and compliance

- [ ] ODPC applicability and registration have been completed where required.
- [ ] KRA/eTIMS invoicing and accounting processes are operational.
- [ ] Consumer, privacy, payment, return, refund and warranty obligations are reviewed.
- [ ] Courier, fulfilment, support, payment and accounting responsibilities have named owners.

## 12. Recommended implementation sequence

1. **Protect customer data:** secure order success/tracking access and add authorization tests.
2. **Harden configuration:** rotate secrets, fail closed in production and add security/rate-limit controls.
3. **Finish payment operations:** production decision, expiry, reconciliation, refunds and monitoring.
4. **Complete customer trust:** transactional email, real support details and approved policy pages.
5. **Build operational safety:** staging, monitoring, readiness, backups, restore and rollback.
6. **Prove the release:** E2E, concurrency, accessibility, performance, load and security testing.
7. **Run the controlled pilot:** supervised orders, daily reconciliation and incident review.
8. **Hold the public-launch review:** approve, defer or disable each remaining risk explicitly.

Deliver each group as focused, reviewable commits or pull requests with tests, evidence and rollback notes.

## 13. Launch metrics

### Commerce

- Product-view to add-to-cart rate
- Cart to checkout-start rate
- Checkout completion by payment method
- Average order value
- Payment initiation and success rate
- Retried/duplicate checkout count
- Cancellation, return and refund rate

### Operations

- Order-to-confirmation, packing, dispatch and delivery time
- Orders outside promised service level
- Failed-delivery and return-to-sender rate
- Inventory reservation expiry and stock variance
- Unresolved payment reconciliation items

### Reliability and support

- Availability, server error rate and P50/P95 latency
- Core Web Vitals
- Password-reset and transactional-message delivery/failure rate
- Support first-response and resolution time
- Incidents by severity and recurrence

Each metric must have a business purpose, named owner and retention period. Do not collect customer data merely because it is technically available.

## 14. Document maintenance

- Review this roadmap at least weekly until public launch.
- Update the implementation inventory whenever code or production evidence changes.
- Attach evidence to completed launch gates: pull request, automated test, deployed URL, screenshot, policy approval, reconciliation report or restore record.
- Do not mark a launch gate complete merely because code has been merged.
- Record accepted launch risk with an owner, reason, mitigation, review date and expiry date.
- Keep detailed integration checklists, such as M-Pesa production readiness, as linked supporting documents rather than duplicating them here.
- After public launch, convert this roadmap into a recurring operational-readiness and recovery checklist.
