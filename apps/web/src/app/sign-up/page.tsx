import { AuthForm } from "@/components/auth/auth-form";
import { redirect } from "next/navigation";

export const metadata = { title: "Create account" };

type SignUpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

  if (params?.email || params?.password) {
    redirect("/sign-up");
  }

  const error =
    typeof params?.error === "string" ? params.error : undefined;

  return (
    <section className="bg-[var(--color-cream)] py-16">
      <div className="page-shell">
        <AuthForm mode="sign-up" error={error} />
      </div>
    </section>
  );
}
