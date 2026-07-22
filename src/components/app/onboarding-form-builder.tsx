"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import { InfoTooltip } from "@/components/app/info-tooltip";
import type { OnboardingField, OnboardingFieldType } from "@/lib/onboarding-fields";

const FIELD_TYPES: OnboardingFieldType[] = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
  "multiselect",
];

type FieldDraft = {
  label: string;
  field_type: OnboardingFieldType;
  required: boolean;
  allow_other: boolean;
  options: { value: string; label: string }[];
  mask: string | null;
};

const inputClass =
  "h-9 rounded-md border border-(--border-default) bg-(--bg-canvas) px-2.5 text-[13px] text-(--ink) outline-none focus:border-(--brand-500)";

function FieldEditor({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial: OnboardingField | null;
  onCancel: () => void;
  onSave: (draft: FieldDraft) => void;
  saving: boolean;
}) {
  const t = useTranslations("adminPage");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [fieldType, setFieldType] = useState<OnboardingFieldType>(initial?.field_type ?? "text");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [allowOther, setAllowOther] = useState(initial?.allow_other ?? false);
  const [optionLabels, setOptionLabels] = useState<string[]>(
    initial?.options.map((o) => o.label) ?? []
  );
  const [optionDraft, setOptionDraft] = useState("");
  const [mask, setMask] = useState(initial?.mask ?? "");

  const isChoiceType = fieldType === "select" || fieldType === "multiselect";
  const showMaskSection = fieldType === "text" || fieldType === "date";
  const displayKey = initial?.key ?? slugify(label);

  const typeLabels: Record<OnboardingFieldType, string> = {
    text: t("onboardingFieldTypeText"),
    textarea: t("onboardingFieldTypeTextarea"),
    number: t("onboardingFieldTypeNumber"),
    boolean: t("onboardingFieldTypeBoolean"),
    date: t("onboardingFieldTypeDate"),
    select: t("onboardingFieldTypeSelect"),
    multiselect: t("onboardingFieldTypeMultiselect"),
  };

  function addOption() {
    const trimmed = optionDraft.trim();
    if (!trimmed || optionLabels.includes(trimmed)) return;
    setOptionLabels((prev) => [...prev, trimmed]);
    setOptionDraft("");
  }

  function removeOption(idx: number) {
    setOptionLabels((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      field_type: fieldType,
      required,
      allow_other: isChoiceType && allowOther,
      options: isChoiceType ? optionLabels.map((l) => ({ value: slugify(l), label: l })) : [],
      mask: showMaskSection && mask.trim() ? mask.trim() : null,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-(--brand-500)/30 bg-(--accent-soft) p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-(--ink)">
            {t("onboardingFieldLabelInputLabel")}
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputClass}
          />
          {displayKey && <span className="text-[11px] text-(--ink-soft)">{displayKey}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-medium text-(--ink)">
            {t("onboardingFieldTypeLabel")}
          </label>
          <select
            value={fieldType}
            disabled={!!initial}
            onChange={(e) => setFieldType(e.target.value as OnboardingFieldType)}
            className={inputClass}
          >
            {FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {typeLabels[ft]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showMaskSection && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[12.5px] font-medium text-(--ink)">
              {t("onboardingFieldMaskLabel")}
            </label>
            <InfoTooltip label={t("onboardingFieldMaskTooltipTitle")}>
              <p className="font-semibold text-(--ink)">{t("onboardingFieldMaskTooltipTitle")}</p>
              {fieldType === "date" ? (
                <>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-9 shrink-0 items-center justify-center rounded bg-(--accent-soft) font-mono text-[11px] font-bold text-(--brand-500)">
                        D M Y
                      </span>
                      <span>{t("onboardingFieldMaskTooltipDateDigit")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-(--bg-canvas) font-mono text-[11px] font-bold text-(--ink-soft)">
                        /
                      </span>
                      <span>{t("onboardingFieldMaskTooltipLiteral")}</span>
                    </li>
                  </ul>
                  <div className="mt-2.5 rounded-md bg-(--bg-canvas) p-2">
                    <p className="font-mono text-[11px] text-(--brand-500)">DD/MM/YYYY</p>
                    <p className="mt-1 text-(--ink-soft)">{t("onboardingFieldMaskTooltipDateNote")}</p>
                  </div>
                </>
              ) : (
                <>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-(--accent-soft) font-mono text-[11px] font-bold text-(--brand-500)">
                        9
                      </span>
                      <span>{t("onboardingFieldMaskTooltipDigit")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-(--accent-soft) font-mono text-[11px] font-bold text-(--brand-500)">
                        Z
                      </span>
                      <span>{t("onboardingFieldMaskTooltipAlnum")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-(--bg-canvas) font-mono text-[11px] font-bold text-(--ink-soft)">
                        .
                      </span>
                      <span>{t("onboardingFieldMaskTooltipLiteral")}</span>
                    </li>
                  </ul>
                  <div className="mt-2.5 rounded-md bg-(--bg-canvas) p-2">
                    <p className="font-mono text-[11px] text-(--brand-500)">ZZ.ZZZ.ZZZ/ZZZZ-99</p>
                    <p className="mt-1 text-(--ink-soft)">{t("onboardingFieldMaskTooltipCnpjNote")}</p>
                  </div>
                </>
              )}
            </InfoTooltip>
          </div>
          <input
            type="text"
            value={mask}
            placeholder={fieldType === "date" ? "DD/MM/YYYY" : "ZZ.ZZZ.ZZZ/ZZZZ-99"}
            onChange={(e) => setMask(e.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-(--ink)">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 accent-(--brand-500)"
          />
          {t("onboardingFieldRequiredLabel")}
        </label>
        {isChoiceType && (
          <label className="flex items-center gap-2 text-[13px] text-(--ink)">
            <input
              type="checkbox"
              checked={allowOther}
              onChange={(e) => setAllowOther(e.target.checked)}
              className="h-4 w-4 accent-(--brand-500)"
            />
            {t("onboardingFieldAllowOtherLabel")}
          </label>
        )}
      </div>

      {isChoiceType && (
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-(--ink)">
            {t("onboardingFieldOptionsLabel")}
          </span>
          {optionLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {optionLabels.map((l, idx) => (
                <span
                  key={`${l}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-full bg-(--bg-surface) px-2.5 py-1 text-xs font-medium text-(--ink)"
                >
                  {l}
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-(--ink-soft) hover:text-(--danger-500)"
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
              value={optionDraft}
              placeholder={t("onboardingFieldOptionPlaceholder")}
              onChange={(e) => setOptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={addOption}
              className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-surface)"
            >
              {t("onboardingFieldAddOption")}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving || !label.trim()}
          onClick={submit}
          className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t("onboardingFieldSave")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-surface)"
        >
          {t("onboardingFieldCancel")}
        </button>
      </div>
    </div>
  );
}

export function OnboardingFormBuilder({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [fields, setFields] = useState<OnboardingField[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("onboarding_form_fields")
      .select("id, key, label, field_type, options, allow_other, required, position, mask")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });
    setFields((data as OnboardingField[] | null) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(draft: FieldDraft) {
    setErrorMsg(null);
    setBusy("new");
    const supabase = createClient();
    const { error } = await supabase.from("onboarding_form_fields").insert({
      tenant_id: tenantId,
      key: slugify(draft.label),
      label: draft.label,
      field_type: draft.field_type,
      options: draft.options,
      allow_other: draft.allow_other,
      required: draft.required,
      mask: draft.mask,
      position: fields?.length ?? 0,
    });
    setBusy(null);
    if (error) {
      setErrorMsg(
        error.code === "23505" ? t("onboardingFieldDuplicateKeyError") : t("onboardingFieldSaveError")
      );
      return;
    }
    setAdding(false);
    load();
  }

  async function handleUpdate(id: string, draft: FieldDraft) {
    setErrorMsg(null);
    setBusy(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("onboarding_form_fields")
      .update({
        label: draft.label,
        options: draft.options,
        allow_other: draft.allow_other,
        required: draft.required,
        mask: draft.mask,
      })
      .eq("id", id);
    setBusy(null);
    if (error) {
      setErrorMsg(t("onboardingFieldSaveError"));
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("onboarding_form_fields").delete().eq("id", id);
    setBusy(null);
    load();
  }

  async function move(id: string, direction: "up" | "down") {
    if (!fields) return;
    const idx = fields.findIndex((f) => f.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= fields.length) return;
    const a = fields[idx];
    const b = fields[swapIdx];
    setBusy(id);
    const supabase = createClient();
    await Promise.all([
      supabase.from("onboarding_form_fields").update({ position: b.position }).eq("id", a.id),
      supabase.from("onboarding_form_fields").update({ position: a.position }).eq("id", b.id),
    ]);
    setBusy(null);
    load();
  }

  const typeLabels: Record<OnboardingFieldType, string> = {
    text: t("onboardingFieldTypeText"),
    textarea: t("onboardingFieldTypeTextarea"),
    number: t("onboardingFieldTypeNumber"),
    boolean: t("onboardingFieldTypeBoolean"),
    date: t("onboardingFieldTypeDate"),
    select: t("onboardingFieldTypeSelect"),
    multiselect: t("onboardingFieldTypeMultiselect"),
  };

  if (fields === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {fields.length === 0 && !adding && (
        <p className="text-[13.5px] text-(--ink-soft)">{t("onboardingFieldsEmpty")}</p>
      )}

      {fields.map((field, idx) =>
        editingId === field.id ? (
          <FieldEditor
            key={field.id}
            initial={field}
            saving={busy === field.id}
            onCancel={() => setEditingId(null)}
            onSave={(draft) => handleUpdate(field.id, draft)}
          />
        ) : (
          <div
            key={field.id}
            className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold text-(--ink)">{field.label}</p>
                <span className="rounded-full bg-(--accent-soft) px-2 py-0.5 text-[11px] font-semibold text-(--brand-500)">
                  {typeLabels[field.field_type]}
                </span>
                {field.required && (
                  <span className="text-[11px] font-semibold uppercase text-(--warning-500)">
                    {t("onboardingFieldRequiredLabel")}
                  </span>
                )}
                {(field.field_type === "select" || field.field_type === "multiselect") &&
                  field.options.map((o) => (
                    <span
                      key={o.value}
                      className="rounded-full border border-(--border-default) bg-(--bg-canvas) px-2 py-0.5 text-[11px] font-medium text-(--ink-soft)"
                    >
                      {o.label}
                    </span>
                  ))}
              </div>
              <p className="text-[12px] text-(--ink-soft)">
                {field.key}
                {field.mask && <span className="font-mono"> · {field.mask}</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={busy === field.id || idx === 0}
                onClick={() => move(field.id, "up")}
                className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-2 text-[12px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft) disabled:opacity-40"
              >
                {t("onboardingFieldMoveUp")}
              </button>
              <button
                type="button"
                disabled={busy === field.id || idx === fields.length - 1}
                onClick={() => move(field.id, "down")}
                className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-2 text-[12px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft) disabled:opacity-40"
              >
                {t("onboardingFieldMoveDown")}
              </button>
              <button
                type="button"
                disabled={busy === field.id}
                onClick={() => setEditingId(field.id)}
                className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-3 text-[12.5px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
              >
                {t("onboardingFieldEdit")}
              </button>
              <button
                type="button"
                disabled={busy === field.id}
                onClick={() => handleDelete(field.id)}
                className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-3 text-[12.5px] font-medium text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
              >
                {t("onboardingFieldDelete")}
              </button>
            </div>
          </div>
        )
      )}

      {adding ? (
        <FieldEditor
          initial={null}
          saving={busy === "new"}
          onCancel={() => setAdding(false)}
          onSave={handleCreate}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 w-fit items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
        >
          {t("onboardingFieldsAddButton")}
        </button>
      )}

      {errorMsg && <p className="text-xs text-(--danger-500)">{errorMsg}</p>}
    </div>
  );
}
