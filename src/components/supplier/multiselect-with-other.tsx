"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { OnboardingFieldOption } from "@/lib/onboarding-fields";

// Checkboxes for the predefined options, plus (when allowOther) a text input
// that appends free-text entries as removable chips. No structural
// predefined/custom distinction is stored in `value` — it's re-derived on
// render by checking membership in `options`, so pre-filling from a saved
// submission still works even if the admin edited the option list later.
export function MultiSelectWithOther({
  options,
  allowOther,
  value,
  onChange,
  addLabel,
  placeholder,
  otherLabel,
}: {
  options: OnboardingFieldOption[];
  allowOther: boolean;
  value: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  placeholder: string;
  otherLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const customValues = value.filter((v) => !options.some((o) => o.value === v));

  // Groups options by category, preserving first-seen order; uncategorized
  // options ("") render without a header.
  const groups = new Map<string, OnboardingFieldOption[]>();
  for (const option of options) {
    const key = option.category?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }

  function toggle(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    );
  }

  function addCustom() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeCustom(v: string) {
    onChange(value.filter((entry) => entry !== v));
  }

  return (
    <div className="flex flex-col gap-3">
      {options.length > 0 && (
        <div className="flex flex-col gap-3">
          {Array.from(groups.entries()).map(([category, items]) => (
            <div key={category || "__none__"} className="flex flex-col gap-1.5">
              {category && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                  {category}
                </span>
              )}
              <div className="flex flex-col gap-2">
                {items.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-2.5 text-[13px] text-(--ink)"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(o.value)}
                      onChange={() => toggle(o.value)}
                      className="h-4 w-4 shrink-0 accent-(--brand-500)"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {allowOther && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-(--ink)">{otherLabel}</span>
          {customValues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customValues.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-(--accent-soft) px-2.5 py-1 text-xs font-medium text-(--brand-500)"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => removeCustom(v)}
                    className="text-(--brand-500) hover:opacity-70"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              className="h-10 flex-1 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
            />
            <button
              type="button"
              onClick={addCustom}
              className="inline-flex h-10 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
            >
              {addLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
