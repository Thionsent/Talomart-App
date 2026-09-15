# Architecture

## Direction

Talomart starts as a modular monolith. One Next.js deployment contains the storefront, customer account, checkout, admin routes and HTTP API. A separate worker process can be added for retryable asynchronous work such as payment reconciliation and notifications.

```text
Browser
  |
  v
Next.js web application
  |-- Storefront, cart and checkout UI
  |-- Customer account UI
  |-- Admin UI
  |-- Auth and API routes
  `-- Domain services
         |
         |-- Supabase PostgreSQL (source of truth)
         |-- Supabase Storage (product media, when enabled)
         |-- Supabase Queues or optional worker queue
         |-- Safaricom Daraja (payments)
         `-- Email/SMS providers
```

## Module boundaries

- Catalogue: categories, products, images, prices and search.
- Identity: customers, staff, sessions and access control.
- Cart: guest carts, authenticated carts and cart merging.
- Checkout: checkout sessions, delivery details, totals, payment method and order conversion.
- Orders: order items, delivery details, totals and status transitions.
- Payments: M-Pesa requests, callbacks, COD and refunds.
- Inventory: reservations, sales, returns and auditable movements.
- Notifications: email and SMS jobs.
- Admin: catalogue, orders, customers, stock and reporting.

## Consistency rules

- Supabase PostgreSQL is the source of truth for money, orders, payments, checkout state and stock.
- Order creation and inventory reservation run in a database transaction.
- Payment callbacks and every callback side effect must be idempotent by
  checkout request ID before production payments are enabled.
- Currency values are stored as integer minor units, never floating point.
- Background jobs can run more than once without corrupting state.
- Admin authorization is checked server-side for every protected mutation.

## Scaling path

1. Scale the Next.js application and optional worker independently.
2. Use Supabase connection pooling for application traffic.
3. Add PostgreSQL read replicas only after query evidence justifies them.
4. Move product search from PostgreSQL to Typesense when catalogue size or search analytics justify it.
5. Extract a service only when it has a distinct scaling or ownership requirement.
