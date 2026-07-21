import Link from "next/link";

import { Button } from "@talomart/ui";

interface SectionPageProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function SectionPage({
  eyebrow,
  title,
  description,
  children
}: SectionPageProps) {
  return (
    <section className="min-h-[58vh] bg-[var(--color-cream)] py-16">
      <div className="page-shell rounded-2xl bg-white p-8 shadow-sm md:p-12">
        <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[var(--color-green)]">
          {eyebrow}
        </span>
        <h1 className="font-brand mt-3 max-w-3xl text-4xl font-extrabold tracking-tight">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          {description}
        </p>
        {children ?? (
          <Link href="/products" className="mt-7 inline-block">
            <Button>Continue shopping</Button>
          </Link>
        )}
      </div>
    </section>
  );
}
