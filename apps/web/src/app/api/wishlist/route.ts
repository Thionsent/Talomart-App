import { sql } from "@talomart/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { MAX_WISHLIST_ITEMS } from "@/lib/wishlist-storage";

const productIdSchema = z.string().uuid();
const toggleSchema = z.object({
  productId: productIdSchema,
  saved: z.boolean()
});
const syncSchema = z.object({
  productIds: z.array(productIdSchema).max(MAX_WISHLIST_ITEMS)
});

async function getCustomerId() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  return session && role === "customer" ? session.user.id : null;
}

async function ensureWishlist(
  runner: typeof sql,
  userId: string
) {
  const [wishlist] = await runner<{ id: string }[]>`
    insert into wishlists (user_id)
    values (${userId})
    on conflict (user_id)
    do update set updated_at = now()
    returning id::text
  `;

  if (!wishlist) throw new Error("Wishlist could not be created.");
  return wishlist.id;
}

export async function GET() {
  const userId = await getCustomerId();
  if (!userId) {
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  }

  const items = await sql<{ productId: string }[]>`
    select wi.product_id::text as "productId"
    from wishlist_items wi
    inner join wishlists w on w.id = wi.wishlist_id
    inner join products p on p.id = wi.product_id
    inner join categories c on c.id = p.category_id
    where w.user_id = ${userId}
      and p.is_active = true
      and c.is_active = true
    order by wi.created_at desc
    limit ${MAX_WISHLIST_ITEMS}
  `;

  return NextResponse.json({
    productIds: items.map((item) => item.productId)
  });
}

export async function POST(request: Request) {
  const userId = await getCustomerId();
  if (!userId) {
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  }

  const parsed = syncSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wishlist data." }, { status: 400 });
  }

  const productIds = [...new Set(parsed.data.productIds)];
  if (!productIds.length) return NextResponse.json({ synchronized: 0 });

  const synchronized = await sql.begin(async (transaction) => {
    const runner = transaction as unknown as typeof sql;
    const wishlistId = await ensureWishlist(runner, userId);

    const rows = await runner<{ productId: string }[]>`
      insert into wishlist_items (wishlist_id, product_id)
      select ${wishlistId}::uuid, p.id
      from products p
      inner join categories c on c.id = p.category_id
      where p.id = any(${productIds}::uuid[])
        and p.is_active = true
        and c.is_active = true
      on conflict (wishlist_id, product_id) do nothing
      returning product_id::text as "productId"
    `;

    return rows.length;
  });

  return NextResponse.json({ synchronized });
}

export async function PUT(request: Request) {
  const userId = await getCustomerId();
  if (!userId) {
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  }

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wishlist update." }, { status: 400 });
  }

  const result = await sql.begin(async (transaction) => {
    const runner = transaction as unknown as typeof sql;
    const wishlistId = await ensureWishlist(runner, userId);

    if (!parsed.data.saved) {
      await runner`
        delete from wishlist_items
        where wishlist_id = ${wishlistId}::uuid
          and product_id = ${parsed.data.productId}::uuid
      `;
      return { saved: false };
    }

    const rows = await runner<{ productId: string }[]>`
      insert into wishlist_items (wishlist_id, product_id)
      select ${wishlistId}::uuid, p.id
      from products p
      inner join categories c on c.id = p.category_id
      where p.id = ${parsed.data.productId}::uuid
        and p.is_active = true
        and c.is_active = true
      on conflict (wishlist_id, product_id) do nothing
      returning product_id::text as "productId"
    `;

    if (!rows.length) {
      const existing = await runner<{ exists: boolean }[]>`
        select exists (
          select 1
          from wishlist_items
          where wishlist_id = ${wishlistId}::uuid
            and product_id = ${parsed.data.productId}::uuid
        ) as exists
      `;

      if (!existing[0]?.exists) {
        throw new Error("Product is not available.");
      }
    }

    return { saved: true };
  }).catch(() => null);

  if (!result) {
    return NextResponse.json({ error: "Product is not available." }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function DELETE() {
  const userId = await getCustomerId();
  if (!userId) {
    return NextResponse.json({ error: "Customer sign-in required." }, { status: 401 });
  }

  await sql`
    delete from wishlist_items wi
    using wishlists w
    where wi.wishlist_id = w.id
      and w.user_id = ${userId}
  `;

  return NextResponse.json({ cleared: true });
}
