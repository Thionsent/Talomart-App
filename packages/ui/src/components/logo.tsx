import { cn } from "../lib/cn";

export interface LogoProps {
  className?: string;
  compact?: boolean;
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative h-10 w-10 -rotate-3 rounded-[10px_10px_16px_16px] border-4 border-[var(--color-green)]">
        <span className="absolute -top-3 left-1.5 h-2.5 w-5 rounded-t-full border-4 border-b-0 border-[var(--color-orange)]" />
        <span className="absolute right-1 top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-orange)] shadow-[-13px_10px_0_var(--color-green)]" />
      </span>
      {!compact && (
        <span className="font-brand text-[1.35rem] font-extrabold leading-5 tracking-[-0.06em] text-[var(--color-navy)]">
          Talo<span className="text-[var(--color-green)]">mart</span>
          <small className="mt-1 block text-[0.45rem] tracking-[0.45em] text-[var(--color-orange)]">
            STORES
          </small>
        </span>
      )}
    </span>
  );
}
