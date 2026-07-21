import { StorefrontHome } from "@/components/storefront/storefront-home";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 60;

export default async function HomePage() {
  const storefrontData = await getStorefrontData();

  return <StorefrontHome {...storefrontData} />;
}
