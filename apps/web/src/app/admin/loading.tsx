const skeletonCards = ["Products", "Orders", "Customers", "Revenue", "Low stock"];

export default function AdminLoading() {
  return (
    <section className="bg-[var(--color-cream)] py-6 sm:py-10">
      <div className="page-shell">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-3xl bg-[var(--color-navy)] p-5 text-white shadow-sm">
              <div className="h-12 w-40 animate-pulse rounded-2xl bg-white/15" />
              <div className="mt-6 h-24 animate-pulse rounded-2xl bg-white/10" />
              <div className="mt-6 grid gap-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 animate-pulse rounded-xl bg-white/10"
                  />
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="rounded-3xl bg-[var(--color-navy)] p-6 text-white shadow-sm sm:p-8">
              <div className="h-4 w-44 animate-pulse rounded-full bg-white/20" />
              <div className="mt-4 h-10 max-w-sm animate-pulse rounded-2xl bg-white/20" />
              <div className="mt-4 h-4 max-w-xl animate-pulse rounded-full bg-white/10" />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {skeletonCards.map((card) => (
                <article key={card} className="rounded-3xl bg-white p-5 shadow-sm">
                  <div className="h-7 w-7 animate-pulse rounded-xl bg-slate-100" />
                  <div className="mt-4 h-3 w-24 animate-pulse rounded-full bg-slate-100" />
                  <div className="mt-3 h-8 w-20 animate-pulse rounded-xl bg-slate-100" />
                  <span className="sr-only">Loading {card}</span>
                </article>
              ))}
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
