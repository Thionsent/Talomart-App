import { AdminTwoFactorChallenge } from "@/components/auth/admin-two-factor-challenge";

export const metadata = { title: "Admin verification" };

export default function AdminTwoFactorPage() {
  return (
    <section className="bg-[var(--color-cream)] py-16">
      <div className="page-shell">
        <AdminTwoFactorChallenge />
      </div>
    </section>
  );
}
