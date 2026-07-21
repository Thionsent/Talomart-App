"use client";

import { useFormStatus } from "react-dom";

type ConfirmKind = "archive" | "inventory" | "order";

type AdminSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  confirmMessage?: string;
  confirmKind?: ConfirmKind;
  className: string;
};

function confirmationForKind(kind: ConfirmKind | undefined, button: HTMLButtonElement) {
  const form = button.form;
  if (!form || !kind) return null;

  const formData = new FormData(form);

  if (kind === "archive") {
    return "Archive this item? It will be hidden from customers, but existing records stay safe.";
  }

  if (kind === "inventory") {
    const quantityChange = Number(formData.get("quantityChange") ?? 0);

    if (quantityChange < 0) {
      return "This will reduce stock. Confirm that the physical count has been checked.";
    }
  }

  if (kind === "order") {
    const status = String(formData.get("status") ?? "");

    if (["delivered", "cancelled", "returned"].includes(status)) {
      return `Confirm order status change to "${status.replace(/_/g, " ")}"? This may affect inventory reservations.`;
    }
  }

  return null;
}

export function AdminSubmitButton({
  children,
  pendingLabel = "Working...",
  confirmMessage,
  confirmKind,
  className
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        const message =
          confirmMessage ??
          confirmationForKind(confirmKind, event.currentTarget);

        if (message && !window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
