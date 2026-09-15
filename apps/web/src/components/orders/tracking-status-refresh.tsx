"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TrackingStatusRefresh({
  intervalSeconds = 30
}: {
  intervalSeconds?: number;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 700);
  }

  useEffect(() => {
    const interval = window.setInterval(
      () => router.refresh(),
      intervalSeconds * 1000
    );
    return () => window.clearInterval(interval);
  }, [intervalSeconds, router]);

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-[var(--color-navy)] disabled:cursor-wait disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Refreshing…" : "Refresh status"}
    </button>
  );
}
