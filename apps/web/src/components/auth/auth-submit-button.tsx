"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AuthSubmitButton({
  label,
  pendingLabel
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--color-green-dark)] disabled:cursor-wait disabled:opacity-70"
    >
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}
