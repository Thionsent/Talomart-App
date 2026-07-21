# ADR 0001: Start with a modular monolith

Status: accepted

## Decision

Use a Next.js modular monolith with PostgreSQL and a separate BullMQ worker. Keep domain modules internally separated, but deploy one web application initially.

## Reasons

- Keeps checkout and inventory transactions straightforward.
- Reduces deployment and observability complexity.
- Allows the storefront and admin application to share typed domain contracts.
- Supports independent worker scaling for payments and notifications.
- Leaves clear extraction boundaries if traffic or team ownership later demands services.

## Rejected alternatives

- Microservices now: operational cost without a current scaling requirement.
- Browser-only persistence: cannot guarantee payment, order or stock correctness.
- Plugin-based hosted storefront: restricts the custom Talomart experience and data model.
