"use client";

import {
  ChevronDown,
  Heart,
  MapPin,
  PackageCheck,
  TriangleAlert,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { customerAuthHref } from "@/lib/auth-redirect";

export type HeaderCustomer = {
  name: string;
  email: string;
};

export function CustomerAccountMenu({
  customer,
  sessionUnavailable = false
}: {
  customer: HeaderCustomer | null;
  sessionUnavailable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!customer) {
    const returnDestination =
      pathname === "/" || pathname.startsWith("/sign-")
        ? "/account"
        : pathname;

    return (
      <Link
        href={customerAuthHref("/sign-in", returnDestination)}
        className={`header-action ${sessionUnavailable ? "account-unavailable" : ""}`}
        aria-label={
          sessionUnavailable
            ? "Customer account is temporarily unavailable"
            : "Sign in to your Talomart account"
        }
        title={
          sessionUnavailable
            ? "We could not check your account session. Select to try again."
            : undefined
        }
      >
        <span className="action-icon">
          {sessionUnavailable ? <TriangleAlert /> : <UserRound />}
        </span>
        <span>
          <small>{sessionUnavailable ? "Temporarily unavailable" : "Hello, sign in"}</small>
          <strong>My Account</strong>
        </span>
      </Link>
    );
  }

  const firstName = customer.name.trim().split(/\s+/)[0] || "Customer";

  return (
    <div className="account-menu" ref={wrapperRef}>
      <button
        type="button"
        className="header-action account-trigger"
        aria-label={`Open account menu for ${customer.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="action-icon account-avatar" aria-hidden="true">
          {firstName.slice(0, 1).toUpperCase()}
        </span>
        <span>
          <small>Hello, {firstName}</small>
          <strong>My Account</strong>
        </span>
        <ChevronDown className={`account-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="account-dropdown" role="menu" aria-label="Customer account">
          <div className="account-dropdown-profile">
            <span className="account-profile-avatar" aria-hidden="true">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <small>Signed in as</small>
              <strong>{customer.name}</strong>
              <span>{customer.email}</span>
            </span>
          </div>

          <nav className="account-dropdown-links" aria-label="Account shortcuts">
            <Link href="/account" role="menuitem" onClick={() => setOpen(false)}>
              <UserRound />
              Account overview
            </Link>
            <Link href="/account#orders" role="menuitem" onClick={() => setOpen(false)}>
              <PackageCheck />
              My orders
            </Link>
            <Link href="/track" role="menuitem" onClick={() => setOpen(false)}>
              <MapPin />
              Track an order
            </Link>
            <Link href="/wishlist" role="menuitem" onClick={() => setOpen(false)}>
              <Heart />
              My wishlist
            </Link>
          </nav>

          <div className="account-dropdown-signout">
            <SignOutButton variant="menu" />
          </div>
        </div>
      )}
    </div>
  );
}
