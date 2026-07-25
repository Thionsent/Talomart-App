import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections
}: {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <section className="bg-[var(--color-cream)] py-10 sm:py-14">
      <div className="page-shell max-w-4xl">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--color-green)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Talomart
        </Link>
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="bg-[var(--color-navy)] p-7 text-white sm:p-10">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.22em] text-[var(--color-orange)]">
              <ShieldCheck className="h-4 w-4" /> {eyebrow}
            </span>
            <h1 className="font-brand mt-4 text-3xl font-extrabold sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100">
              {summary}
            </p>
            <p className="mt-5 text-xs font-bold text-blue-200">
              Effective {effectiveDate}
            </p>
          </header>
          <div className="grid gap-8 p-7 sm:p-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-brand text-xl font-extrabold text-[var(--color-navy)]">
                  {section.title}
                </h2>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
