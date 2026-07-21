"use client";

import { useEffect } from "react";

import { Button } from "@talomart/ui";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="page-shell py-20">
      <h1 className="font-brand text-3xl font-extrabold">
        Something went wrong
      </h1>
      <p className="my-4 text-sm text-slate-600">
        The error was recorded. Please try the request again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
