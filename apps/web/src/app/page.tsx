import { StorefrontHome } from "@/components/storefront/storefront-home";
import { getStorefrontData } from "@/lib/storefront-data";
import { siteUrl } from "@/lib/seo";

export const revalidate = 60;
export const metadata = { alternates: { canonical: siteUrl } };

export default async function HomePage() {
  const storefrontData = await getStorefrontData();

  return <StorefrontHome {...storefrontData} />;
}
