import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export const metadata = {
  title: "Reset password",
  description: "Request a secure Talomart customer password reset link."
};

export default function ForgotPasswordPage() {
  return (
    <section className="min-h-[62vh] bg-[var(--color-cream)] py-12 sm:py-16">
      <div className="page-shell">
        <PasswordResetRequestForm />
      </div>
    </section>
  );
}
