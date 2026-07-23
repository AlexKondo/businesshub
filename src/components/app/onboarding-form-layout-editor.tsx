"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { GridResizableCell } from "@/components/app/grid-resizable-cell";
import type { OnboardingField } from "@/lib/onboarding-fields";

const previewInputClass =
  "h-10 w-full rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink-soft) outline-none disabled:cursor-not-allowed";

const MIN_TEXTAREA_ROWS = 2;
const MAX_TEXTAREA_ROWS = 12;
const PX_PER_ROW = 22; // approximate line-height of the preview textarea's text size

// Drag the bottom edge to change how many rows the real supplier-facing
// textarea renders with. Same Pointer Capture technique as
// GridResizableCell/ResizableBox (see those for why) — this handle is its
// own small implementation rather than reusing GridResizableCell because it
// resizes vertically, on a fixed-size element, not a horizontal grid span.
function ResizableTextareaPreview({
  rows,
  onCommitRows,
}: {
  rows: number;
  onCommitRows: (rows: number) => void;
}) {
  const [liveRows, setLiveRows] = useState(rows);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local drag state when the persisted `rows` prop changes from outside this component (e.g. another render of the fields list)
    setLiveRows(rows);
  }, [rows]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.dragStartY = String(e.clientY);
    e.currentTarget.dataset.dragStartRows = String(liveRows);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  function computeNextRows(e: React.PointerEvent<HTMLDivElement>): number | null {
    const { dragStartY, dragStartRows } = e.currentTarget.dataset;
    if (dragStartY === undefined || dragStartRows === undefined) return null;
    const deltaRows = Math.round((e.clientY - Number(dragStartY)) / PX_PER_ROW);
    return Math.min(
      MAX_TEXTAREA_ROWS,
      Math.max(MIN_TEXTAREA_ROWS, Number(dragStartRows) + deltaRows)
    );
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextRows(e);
    if (next !== null) setLiveRows(next);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const next = computeNextRows(e);
    delete e.currentTarget.dataset.dragStartY;
    delete e.currentTarget.dataset.dragStartRows;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (next !== null) onCommitRows(next);
  }

  return (
    <div className="relative">
      <textarea disabled rows={liveRows} className={previewInputClass} />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="separator"
        aria-orientation="horizontal"
        className="absolute bottom-0 left-0 h-1.5 w-full touch-none cursor-row-resize hover:bg-(--brand-500)/40"
      />
    </div>
  );
}

function FieldPreview({
  field,
  onCommitRows,
}: {
  field: OnboardingField;
  onCommitRows: (rows: number) => void;
}) {
  const t = useTranslations("supplierOnboarding");
  const tAdmin = useTranslations("adminPage");

  if (field.field_type === "textarea") {
    return <ResizableTextareaPreview rows={field.rows} onCommitRows={onCommitRows} />;
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
  formId,
  formName,
  companyName,
  initialFields,
}: {
  formId: string;
  formName: string;
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

  async function commitRows(id: string, rows: number) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, rows } : f)));
    const supabase = createClient();
    await supabase.from("onboarding_form_fields").update({ rows }).eq("id", id);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{formName}</h1>
          <p className="mt-1 text-[14px] text-(--ink-soft)">
            {t("onboardingFormPreviewSubtitle")}
          </p>
        </div>
        <Link
          href={`/suppliers/onboarding-form/${formId}`}
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
        >
          {t("onboardingFieldsBackToBuilder")}
        </Link>
      </div>

      {fields.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-(--ink-soft)">{t("onboardingFieldsEmpty")}</p>
      ) : (
        // Capped at the same max-width as the real supplier-facing card
        // (SupplierOnboardingShell) — otherwise a layout that looks fine
        // here (using the admin panel's much wider content area) can come
        // out cramped on the actual, narrower form.
        <div
          ref={containerRef}
          className="mt-6 mx-auto grid max-w-[1140px] grid-cols-[repeat(50,minmax(0,1fr))] gap-y-5 rounded-2xl border border-(--border-default) bg-(--bg-surface) p-6 sm:p-8"
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
                <FieldPreview field={field} onCommitRows={(rows) => commitRows(field.id, rows)} />
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
