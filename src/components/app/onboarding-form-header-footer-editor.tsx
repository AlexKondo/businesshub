"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const textareaClass =
  "w-full resize-y rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 py-2 text-[13.5px] text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)";

// Lets the tenant admin set an optional free-text header and footer for a
// form. Both are shown on the supplier-facing form only when non-empty
// (see DynamicOnboardingForm) — leaving either blank hides it entirely.
export function OnboardingFormHeaderFooterEditor({
  formId,
  initialHeader,
  initialFooter,
}: {
  formId: string;
  initialHeader: string;
  initialFooter: string;
}) {
  const t = useTranslations("adminPage");
  const [header, setHeader] = useState(initialHeader);
  const [footer, setFooter] = useState(initialFooter);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = header !== initialHeader || footer !== initialFooter;

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from("onboarding_forms")
      .update({ header_text: header.trim() || null, footer_text: footer.trim() || null })
      .eq("id", formId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-(--ink)">
          {t("onboardingFormHeaderLabel")}
        </label>
        <p className="text-[11.5px] text-(--ink-soft)">{t("onboardingFormHeaderHint")}</p>
        <textarea
          rows={3}
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          placeholder={t("onboardingFormHeaderPlaceholder")}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-medium text-(--ink)">
          {t("onboardingFormFooterLabel")}
        </label>
        <p className="text-[11.5px] text-(--ink-soft)">{t("onboardingFormFooterHint")}</p>
        <textarea
          rows={3}
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          placeholder={t("onboardingFormFooterPlaceholder")}
          className={textareaClass}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={save}
          className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("onboardingFormHeaderFooterSaving") : t("onboardingFieldSave")}
        </button>
        {saved && (
          <span className="text-[12.5px] font-medium text-(--success-500)">
            {t("onboardingFormHeaderFooterSaved")}
          </span>
        )}
      </div>
    </div>
  );
}
