import { AuthForm } from "@/components/auth/auth-form";
import { auth } from "@/lib/auth";
import { safeCustomerDestination } from "@/lib/auth-redirect";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const destination = safeCustomerDestination(
    typeof params?.next === "string" ? params.next : undefined
  );

  if (params?.email || params?.password) {
    const cleanParams = new URLSearchParams();
    if (destination !== "/account") cleanParams.set("next", destination);
    redirect(`/sign-up${cleanParams.size ? `?${cleanParams.toString()}` : ""}`);
  }

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (session && role === "customer") redirect(destination);

  const error =
    typeof params?.error === "string" ? params.error : undefined;

  return (
    <section className="auth-page-section">
      <div className="page-shell">
        <AuthForm mode="sign-up" error={error} destination={destination} />
      </div>
    </section>
  );
}
