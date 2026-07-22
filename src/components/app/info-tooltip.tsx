"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-(--ink-soft) transition-colors hover:text-(--brand-500)"
      >
        <Info size={14} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-md border border-(--border-default) bg-(--bg-surface-raised) p-3 text-xs leading-relaxed text-(--ink) shadow-lg">
          {children}
        </div>
      )}
    </span>
  );
}
