"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { GridResizableCell } from "@/components/app/grid-resizable-cell";
import type { OnboardingField } from "@/lib/onboarding-fields";

const previewInputClass =
  "h-10 w-full rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink-soft) outline-none disabled:cursor-not-allowed";

function FieldPreview({ field }: { field: OnboardingField }) {
  const t = useTranslations("supplierOnboarding");
  const tAdmin = useTranslations("adminPage");

  if (field.field_type === "textarea") {
    return <textarea disabled rows={3} className={previewInputClass} />;
  }
  if (field.field_type === "boolean") {
    return (
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-(--ink-soft)">
          <input type="radio" disabled className="h-4 w-4" />
          {t("booleanYes")}
        </label>
        <label className="flex items-center gap-2 text-[13px] text-(--ink-soft)">
          <input type="radio" disabled className="h-4 w-4" />
          {t("booleanNo")}
        </label>
      </div>
    );
  }
  if (field.field_type === "select" || field.field_type === "multiselect") {
    return (
      <input
        disabled
        readOnly
        value={tAdmin("onboardingFormPreviewOptionsCount", { count: field.options.length })}
        className={previewInputClass}
      />
    );
  }
  return (
    <input
      disabled
      placeholder={field.mask ?? undefined}
      type={field.field_type === "number" ? "number" : "text"}
      className={previewInputClass}
    />
  );
}

export function OnboardingFormLayoutEditor({
  companyName,
  initialFields,
}: {
  companyName: string;
  initialFields: OnboardingField[];
}) {
  const t = useTranslations("adminPage");
  const [fields, setFields] = useState(
    [...initialFields].sort((a, b) => a.position - b.position)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  function resizeLive(id: string, span: number) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, width: span } : f)));
  }

  async function commitResize(id: string, span: number) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, width: span } : f)));
    const supabase = createClient();
    await supabase.from("onboarding_form_fields").update({ width: span }).eq("id", id);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">
            {t("onboardingFormPreviewTitle")}
          </h1>
          <p className="mt-1 text-[14px] text-(--ink-soft)">
            {t("onboardingFormPreviewSubtitle")}
          </p>
        </div>
        <Link
          href="/suppliers/onboarding-form"
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
        >
          {t("onboardingFieldsBackToBuilder")}
        </Link>
      </div>

      {fields.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-(--ink-soft)">{t("onboardingFieldsEmpty")}</p>
      ) : (
        <div
          ref={containerRef}
          className="mt-6 grid grid-cols-[repeat(50,minmax(0,1fr))] gap-y-5 rounded-2xl border border-(--border-default) bg-(--bg-surface) p-6"
        >
          {fields.map((field) => (
            <GridResizableCell
              key={field.id}
              span={field.width}
              containerRef={containerRef}
              onResize={(s) => resizeLive(field.id, s)}
              onResizeEnd={(s) => commitResize(field.id, s)}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-(--ink)">
                  {field.label}
                  {field.required && <span className="text-(--danger-500)"> *</span>}
                </label>
                <FieldPreview field={field} />
              </div>
            </GridResizableCell>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-(--ink-soft)">
        {companyName ? `${companyName} · ` : ""}
        {t("onboardingFormPreviewHint")}
      </p>
    </div>
  );
}
