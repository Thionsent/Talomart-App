import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Choose a new password",
  description: "Securely update your Talomart customer password."
};

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams
}: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const token = typeof params.token === "string" ? params.token : "";
  const invalidToken =
    params.error === "INVALID_TOKEN" || token.length < 16 || token.length > 256;

  return (
    <section className="min-h-[62vh] bg-[var(--color-cream)] py-12 sm:py-16">
      <div className="page-shell">
        <ResetPasswordForm token={token} invalidToken={invalidToken} />
      </div>
    </section>
  );
}
