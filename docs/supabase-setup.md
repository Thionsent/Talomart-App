# Supabase setup

Talomart uses Supabase PostgreSQL as the production data layer. Better Auth remains the application auth/session layer, so Supabase Auth does not need to be enabled for the current architecture.

## 1. Create the project

1. Create a Supabase project at https://database.new.
2. Choose a strong database password and save it in a password manager.
3. Wait until the project database is available.

## 2. Configure database connections

Open Supabase Dashboard -> Connect and copy the PostgreSQL connection strings.

Add these values to the root `.env` file:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Use:

- `DATABASE_URL` for the Next.js runtime. Prefer Shared Pooler transaction mode on port `6543`.
- `DATABASE_DIRECT_URL` for Drizzle migrations. Use the direct connection when IPv6 works, otherwise use Shared Pooler session mode on port `5432`.

Do not commit the completed `.env` file.

## 3. Apply the commerce schema

The Drizzle schema creates the production tables for:

- products, categories and product image metadata
- users/customers, staff roles, sessions and addresses
- carts, cart items, checkout sessions and wishlists
- orders, order items and delivery details
- payments and M-Pesa checkout callback references
- inventory movements and stock audit history
- product reviews

Run:

```powershell
npm run db:setup
npm run db:check
```

## 4. Seed the starter catalogue

`npm run db:setup` runs migrations and loads the starter Talomart catalogue. The seed is safe to rerun because it upserts categories and products.

## 5. Product media

For production product images, create a Supabase Storage bucket:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=product-images
```

Keep writes private and perform uploads only through protected server-side admin actions. The service-role key must never be exposed to the browser and must never use a `NEXT_PUBLIC_` prefix.

## 6. Deployment secrets

Set these in the hosting provider's encrypted secret manager:

- `DATABASE_URL`
- `DATABASE_DIRECT_URL` for migration jobs only
- `AUTH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- payment, email and monitoring secrets as they are introduced

Use separate Supabase projects for staging and production.

## Official references

- [Supabase PostgreSQL connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Queues](https://supabase.com/docs/guides/queues)
