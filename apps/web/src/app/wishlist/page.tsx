import { WishlistPageClient } from "@/components/wishlist/wishlist-page-client";
import { getProducts } from "@/lib/catalog-queries";

export const metadata = { title: "My wishlist" };
export const revalidate = 60;

export default async function WishlistPage() {
  const products = await getProducts({ limit: 500 });

  return <WishlistPageClient products={products} />;
}
