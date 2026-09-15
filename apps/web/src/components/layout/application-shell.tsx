"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { HeaderCustomer } from "@/components/auth/customer-account-menu";
import { SiteHeader } from "@/components/layout/site-header";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import type { LocalCartItem } from "@/lib/cart-storage";

export function ApplicationShell({
  accountScope,
  customer,
  initialCart,
  sessionUnavailable,
  children,
  footer
}: {
  accountScope: string;
  customer: HeaderCustomer | null;
  initialCart: LocalCartItem[];
  sessionUnavailable: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.cartScope = accountScope;
  }, [accountScope]);

  if (pathname.startsWith("/admin")) {
    return <main>{children}</main>;
  }

  return (
    <WishlistProvider
      key={accountScope}
      authenticated={Boolean(customer)}
      storageScope={accountScope}
    >
      <SiteHeader
        key={accountScope}
        cartScope={accountScope}
        initialCart={initialCart}
        customer={customer}
        sessionUnavailable={sessionUnavailable}
      />
      <main>{children}</main>
      {footer}
    </WishlistProvider>
  );
}
