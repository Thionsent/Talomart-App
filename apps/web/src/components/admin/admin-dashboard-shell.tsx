import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  MailWarning,
  Menu,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Users
} from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  permissionForAdminView,
  type StaffPermission
} from "@/lib/admin-authorization";

export type AdminNavigationKey =
  | "overview"
  | "products"
  | "low-stock"
  | "inventory"
  | "orders"
  | "customers"
  | "analytics"
  | "categories"
  | "notifications"
  | "security"
  | "audit";

type AdminShellPrincipal = {
  email: string;
  role: "admin" | "staff";
  can: (permission: StaffPermission) => boolean;
};

type AdminDashboardShellProps = {
  principal: AdminShellPrincipal;
  active: AdminNavigationKey;
  focus?: {
    primary: string;
    secondary: string;
  };
  children: React.ReactNode;
};

const operationalNavigation = [
  { key: "overview", href: "/admin?view=overview", label: "Overview", icon: BarChart3 },
  { key: "products", href: "/admin?view=products", label: "Products", icon: Package },
  { key: "low-stock", href: "/admin?view=low-stock", label: "Low stock", icon: AlertTriangle },
  { key: "inventory", href: "/admin?view=inventory", label: "Inventory", icon: SlidersHorizontal },
  { key: "orders", href: "/admin?view=orders", label: "Orders", icon: ShoppingCart },
  { key: "customers", href: "/admin?view=customers", label: "Customers", icon: Users },
  { key: "analytics", href: "/admin?view=analytics", label: "Analytics", icon: BarChart3 },
  { key: "categories", href: "/admin?view=categories", label: "Categories", icon: ClipboardList }
] as const;

export function AdminDashboardShell({
  principal,
  active,
  focus,
  children
}: AdminDashboardShellProps) {
  const navigation = [
    ...operationalNavigation.filter(
      (item) =>
        principal.role === "admin" ||
        (item.key !== "overview" &&
          principal.can(permissionForAdminView(item.key)))
    ),
    ...(principal.can("staff.manage")
      ? [{ key: "security" as const, href: "/admin/security", label: "Staff security", icon: ShieldCheck }]
      : []),
    ...(principal.can("orders.manage")
      ? [{ key: "notifications" as const, href: "/admin/notifications", label: "Email delivery", icon: MailWarning }]
      : []),
    ...(principal.can("audit.read")
      ? [{ key: "audit" as const, href: "/admin/audit", label: "Audit log", icon: ScrollText }]
      : [])
  ];
  const activeLabel =
    navigation.find((item) => item.key === active)?.label ?? "Admin";

  return (
    <section className="bg-[var(--color-cream)] py-6 sm:py-10">
      <div className="page-shell">
        <details className="sticky top-3 z-40 mb-5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-[var(--color-navy)] px-4 py-3 text-sm font-extrabold text-white [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <Menu className="h-5 w-5" />
              Admin menu
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-blue-100">
              {activeLabel}
            </span>
          </summary>
          <nav className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Admin navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active === item.key ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-extrabold ${
                  active === item.key
                    ? "bg-green-50 text-[var(--color-green)]"
                    : "text-[var(--color-navy)] hover:bg-green-50 hover:text-[var(--color-green)]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <SignOutButton audience="admin" variant="menu" />
          </nav>
        </details>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-3xl bg-[var(--color-navy)] p-5 text-white shadow-sm">
              <Link href="/admin" className="flex items-center gap-3">
                <span className="brand-mark" aria-hidden="true" />
                <span>
                  <strong className="font-brand block text-lg font-black">Talomart</strong>
                  <small className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-orange)]">Admin v1.5</small>
                </span>
              </Link>

              <div className="mt-6 rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">Signed in</p>
                <p className="mt-2 truncate text-sm font-extrabold">{principal.email}</p>
                <p className="mt-1 text-xs capitalize text-blue-100">{principal.role} access</p>
              </div>

              <nav className="mt-6 grid gap-1" aria-label="Admin navigation">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active === item.key ? "page" : undefined}
                    className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-extrabold transition ${
                      active === item.key
                        ? "bg-[rgba(17,162,69,0.28)] text-white shadow-[inset_3px_0_0_var(--color-orange)]"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {active === item.key && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-[var(--color-orange)]" />
                    )}
                  </Link>
                ))}
              </nav>

              <div className="mt-4">
                <SignOutButton audience="admin" variant="admin" />
              </div>

              {focus && (
                <div className="mt-6 rounded-2xl bg-white p-4 text-[var(--color-navy)]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Today focus</p>
                  <p className="mt-2 text-sm font-extrabold">{focus.primary}</p>
                  <p className="mt-1 text-xs text-slate-500">{focus.secondary}</p>
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </section>
  );
}
