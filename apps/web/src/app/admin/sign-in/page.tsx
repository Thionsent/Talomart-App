import { AuthForm } from "@/components/auth/auth-form";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin sign in" };

type AdminSignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSignInPage({
  searchParams
}: AdminSignInPageProps) {
  const params = await searchParams;

  if (params?.email || params?.password) {
    redirect("/admin/sign-in");
  }

  const error =
    typeof params?.error === "string" ? params.error : undefined;

  return (
    <section className="bg-[var(--color-cream)] py-16">
      <div className="page-shell">
        <AuthForm mode="sign-in" audience="admin" error={error} />
      </div>
    </section>
  );
}
