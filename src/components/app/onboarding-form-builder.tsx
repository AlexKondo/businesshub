"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Check, Pencil, Trash2, Upload, FileText, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import { reorder, useDragReorder } from "@/lib/use-drag-reorder";
import { InfoTooltip } from "@/components/app/info-tooltip";
import { ResizableBox } from "@/components/app/resizable-box";
import { uploadOnboardingFile } from "@/lib/onboarding-files-client";
import { FILE_ACCEPT_ATTR } from "@/lib/onboarding-files";
import type { OnboardingField, OnboardingFieldType } from "@/lib/onboarding-fields";

type FieldWidths = {
  label: number;
  type: number;
  otherLabel: number;
  optionCategory: number;
  optionLabel: number;
};

const DEFAULT_FIELD_WIDTHS: FieldWidths = {
  label: 420,
  type: 260,
  otherLabel: 240,
  optionCategory: 200,
  optionLabel: 420,
};
const MIN_FIELD_WIDTH = 140;
const MAX_FIELD_WIDTH = 700;

const FIELD_TYPES: OnboardingFieldType[] = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
  "multiselect",
  "file",
  "download",
];

type OptionDraft = { label: string; category?: string };

type FieldDraft = {
  label: string;
  field_type: OnboardingFieldType;
  required: boolean;
  allow_other: boolean;
  other_label: string | null;
  options: { value: string; label: string; category?: string }[];
  mask: string | null;
  download_path: string | null;
  download_filename: string | null;
};

const inputClass =
  "h-9 rounded-md border border-(--border-default) bg-(--bg-canvas) px-2.5 text-[13px] text-(--ink) outline-none focus:border-(--brand-500)";

// Groups options by category, preserving first-seen order; uncategorized
// options land under the "" key (rendered without a header).
function groupByCategory(options: (OptionDraft & { idx: number })[]) {
  const groups = new Map<string, (OptionDraft & { idx: number })[]>();
  for (const option of options) {
    const key = option.category?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }
  return Array.from(groups.entries());
}

function FieldEditor({
  initial,
  tenantId,
  formId,
  onCancel,
  onSave,
  saving,
  widths,
  onResizeWidth,
  onCommitWidth,
}: {
  initial: OnboardingField | null;
  tenantId: string;
  formId: string;
  onCancel: () => void;
  onSave: (draft: FieldDraft) => void;
  saving: boolean;
  widths: FieldWidths;
  onResizeWidth: (key: keyof FieldWidths, width: number) => void;
  onCommitWidth: (key: keyof FieldWidths, width: number) => void;
}) {
  const t = useTranslations("adminPage");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [fieldType, setFieldType] = useState<OnboardingFieldType>(initial?.field_type ?? "text");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [allowOther, setAllowOther] = useState(initial?.allow_other ?? false);
  const [otherLabel, setOtherLabel] = useState(initial?.other_label ?? "");
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>(
    initial?.options.map((o) => ({ label: o.label, category: o.category })) ?? []
  );
  const [optionDraft, setOptionDraft] = useState("");
  const [optionCategoryDraft, setOptionCategoryDraft] = useState("");
  const [mask, setMask] = useState(initial?.mask ?? "");
  const [downloadPath, setDownloadPath] = useState<string | null>(initial?.download_path ?? null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(
    initial?.download_filename ?? null
  );
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const knownOptionCategories = Array.from(
    new Set(optionDrafts.map((o) => o.category).filter((c): c is string => !!c))
  );

  const isChoiceType = fieldType === "select" || fieldType === "multiselect";
  // Boolean (Sim/Não) can also offer an "Outro" free-text escape hatch, even
  // though it has no admin-defined options list — so allow_other is offered
  // for it too, just without the options editor.
  const supportsAllowOther = isChoiceType || fieldType === "boolean";
  const showMaskSection = fieldType === "text" || fieldType === "date";
  const isDownload = fieldType === "download";
  // 'download' is read-only for the supplier, so "required" is meaningless there.
  const showRequired = !isDownload;

  async function handleAttachUpload(file: File) {
    setAttachBusy(true);
    setAttachError(null);
    const result = await uploadOnboardingFile({
      tenantId,
      formId,
      fieldKey: initial?.key ?? (slugify(label) || "download"),
      kind: "attachment",
      file,
    });
    setAttachBusy(false);
    if (!result.ok) {
      setAttachError(
        result.error === "too_large"
          ? t("onboardingFileTooLarge")
          : result.error === "type_not_allowed"
            ? t("onboardingFileTypeNotAllowed")
            : t("onboardingFileUploadError")
      );
      return;
    }
    setDownloadPath(result.file.path);
    setDownloadFilename(result.file.name);
  }

  const typeLabels: Record<OnboardingFieldType, string> = {
    text: t("onboardingFieldTypeText"),
    textarea: t("onboardingFieldTypeTextarea"),
    number: t("onboardingFieldTypeNumber"),
    boolean: t("onboardingFieldTypeBoolean"),
    date: t("onboardingFieldTypeDate"),
    select: t("onboardingFieldTypeSelect"),
    multiselect: t("onboardingFieldTypeMultiselect"),
    file: t("onboardingFieldTypeFile"),
    download: t("onboardingFieldTypeDownload"),
  };

  function addOption() {
    const trimmed = optionDraft.trim();
    if (!trimmed || optionDrafts.some((o) => o.label === trimmed)) return;
    setOptionDrafts((prev) => [
      ...prev,
      { label: trimmed, category: optionCategoryDraft.trim() || undefined },
    ]);
    setOptionDraft("");
  }

  function removeOption(idx: number) {
    setOptionDrafts((prev) => prev.filter((_, i) => i !== idx));
  }

  function submit() {
    if (!label.trim()) return;
    const usesOther = supportsAllowOther && allowOther;
    onSave({
      label: label.trim(),
      field_type: fieldType,
      required: showRequired && required,
      allow_other: usesOther,
      other_label: usesOther && otherLabel.trim() ? otherLabel.trim() : null,
      options: isChoiceType
        ? optionDrafts.map((o) => ({ value: slugify(o.label), label: o.label, category: o.category }))
        : [],
      mask: showMaskSection && mask.trim() ? mask.trim() : null,
      download_path: isDownload ? downloadPath : null,
      download_filename: isDownload ? downloadFilename : null,
    });
  }

  const saveCancelButtons = (
    <>
      <button
        type="button"
        disabled={saving || !label.trim()}
        onClick={submit}
        title={t("onboardingFieldSave")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-(--brand-500) text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Check size={16} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        title={t("onboardingFieldCancel")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--ink) transition-colors hover:bg-(--bg-surface)"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-(--brand-500)/30 bg-(--accent-soft) p-4">
      {/* One responsive row: label, type, mask, required, save/cancel.
          items-end so every input's bottom lines up on the same baseline
          regardless of the label-on-top headers; wraps gracefully when the
          screen can't fit it all. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 pb-4">
        <ResizableBox
          width={widths.label}
          minWidth={MIN_FIELD_WIDTH}
          maxWidth={MAX_FIELD_WIDTH}
          onResize={(w) => onResizeWidth("label", w)}
          onResizeEnd={(w) => onCommitWidth("label", w)}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-(--ink)">
              {t("onboardingFieldLabelInputLabel")}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
        </ResizableBox>
        <ResizableBox
          width={widths.type}
          minWidth={MIN_FIELD_WIDTH}
          maxWidth={MAX_FIELD_WIDTH}
          onResize={(w) => onResizeWidth("type", w)}
          onResizeEnd={(w) => onCommitWidth("type", w)}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-(--ink)">
              {t("onboardingFieldTypeLabel")}
            </label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as OnboardingFieldType)}
              className={`${inputClass} w-full`}
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {typeLabels[ft]}
                </option>
              ))}
            </select>
          </div>
        </ResizableBox>

        {showMaskSection && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-[12.5px] font-medium text-(--ink) whitespace-nowrap">
                {t("onboardingFieldMaskLabel")}
              </label>
              <InfoTooltip label={t("onboardingFieldMaskTooltipTitle")}>
                <p className="font-semibold text-(--ink)">
                  {t("onboardingFieldMaskTooltipTitle")}
                </p>
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
              className={`${inputClass} w-[220px] font-mono`}
            />
          </div>
        )}

        {showRequired && (
          <label className="flex h-9 items-center gap-2 text-[13px] text-(--ink)">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 accent-(--brand-500)"
            />
            {t("onboardingFieldRequiredLabel")}
          </label>
        )}
        {supportsAllowOther && (
          <label className="flex h-9 items-center gap-2 text-[13px] text-(--ink)">
            <input
              type="checkbox"
              checked={allowOther}
              onChange={(e) => setAllowOther(e.target.checked)}
              className="h-4 w-4 accent-(--brand-500)"
            />
            {t("onboardingFieldAllowOtherLabel")}
          </label>
        )}
        {/* Custom label for the "Other" choice — e.g. "Quando?" instead of the
            default "Outro". Applies to select, boolean and multiselect.
            Drag-resizable like the label/type columns. */}
        {supportsAllowOther && allowOther && (
          <ResizableBox
            width={widths.otherLabel}
            minWidth={MIN_FIELD_WIDTH}
            maxWidth={MAX_FIELD_WIDTH}
            onResize={(w) => onResizeWidth("otherLabel", w)}
            onResizeEnd={(w) => onCommitWidth("otherLabel", w)}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-(--ink) whitespace-nowrap">
                {t("onboardingFieldOtherLabelInputLabel")}
              </label>
              <input
                type="text"
                value={otherLabel}
                placeholder={t("onboardingFieldOtherLabelPlaceholder")}
                onChange={(e) => setOtherLabel(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </div>
          </ResizableBox>
        )}

        {/* For choice types, options are configured below — Save/Cancel
            belong after that, not here, so they stay the last thing on
            screen regardless of field type. */}
        {!isChoiceType && <div className="ml-auto flex h-9 items-center gap-2">{saveCancelButtons}</div>}
      </div>

      {isDownload && (
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-(--ink)">
            {t("onboardingFieldDownloadFileLabel")}
          </span>
          <input
            ref={attachInputRef}
            type="file"
            accept={FILE_ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAttachUpload(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={attachBusy}
              onClick={() => attachInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-surface) disabled:opacity-50"
            >
              <Upload size={14} strokeWidth={1.75} />
              {attachBusy
                ? t("onboardingFileUploading")
                : downloadFilename
                  ? t("onboardingFieldDownloadReplace")
                  : t("onboardingFieldDownloadUpload")}
            </button>
            {downloadFilename && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-(--bg-surface) px-2.5 py-1.5 text-[12.5px] text-(--ink)">
                <FileText size={14} strokeWidth={1.75} className="text-(--ink-soft)" />
                {downloadFilename}
                <button
                  type="button"
                  onClick={() => {
                    setDownloadPath(null);
                    setDownloadFilename(null);
                  }}
                  className="text-(--ink-soft) hover:text-(--danger-500)"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </span>
            )}
          </div>
          {attachError && <span className="text-[12px] text-(--danger-500)">{attachError}</span>}
          <span className="text-[11px] text-(--ink-soft)">{t("onboardingFieldDownloadHint")}</span>
        </div>
      )}

      {isChoiceType && (
        <div className="flex flex-col gap-2">
          <span className="text-[12.5px] font-medium text-(--ink)">
            {t("onboardingFieldOptionsLabel")}
          </span>
          {optionDrafts.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {groupByCategory(optionDrafts.map((o, idx) => ({ ...o, idx }))).map(
                ([optCategory, items]) => (
                  <div key={optCategory || "__none__"} className="flex flex-col gap-1">
                    {optCategory && (
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                        {optCategory}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((o) => (
                        <span
                          key={`${o.label}-${o.idx}`}
                          className="inline-flex items-center gap-1 rounded-full bg-(--bg-surface) px-2.5 py-1 text-xs font-medium text-(--ink)"
                        >
                          {o.label}
                          <button
                            type="button"
                            onClick={() => removeOption(o.idx)}
                            className="text-(--ink-soft) hover:text-(--danger-500)"
                          >
                            <X size={12} strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ResizableBox
              width={widths.optionCategory}
              minWidth={MIN_FIELD_WIDTH}
              maxWidth={MAX_FIELD_WIDTH}
              onResize={(w) => onResizeWidth("optionCategory", w)}
              onResizeEnd={(w) => onCommitWidth("optionCategory", w)}
            >
              <input
                type="text"
                list="option-category-suggestions"
                value={optionCategoryDraft}
                placeholder={t("onboardingFieldOptionCategoryPlaceholder")}
                onChange={(e) => setOptionCategoryDraft(e.target.value)}
                className={`${inputClass} w-full`}
              />
            </ResizableBox>
            <datalist id="option-category-suggestions">
              {knownOptionCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <ResizableBox
              width={widths.optionLabel}
              minWidth={MIN_FIELD_WIDTH}
              maxWidth={MAX_FIELD_WIDTH}
              onResize={(w) => onResizeWidth("optionLabel", w)}
              onResizeEnd={(w) => onCommitWidth("optionLabel", w)}
            >
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
                className={`${inputClass} w-full`}
              />
            </ResizableBox>
            <button
              type="button"
              onClick={addOption}
              className="inline-flex h-9 shrink-0 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-surface)"
            >
              {t("onboardingFieldAddOption")}
            </button>
          </div>
          <span className="text-[11px] text-(--ink-soft)">
            {t("onboardingFieldOptionCategoryHint")}
          </span>
          <div className="flex items-center justify-end gap-2">{saveCancelButtons}</div>
        </div>
      )}
    </div>
  );
}

export function OnboardingFormBuilder({
  tenantId,
  formId,
}: {
  tenantId: string;
  formId: string;
}) {
  const t = useTranslations("adminPage");
  const [fields, setFields] = useState<OnboardingField[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [widths, setWidths] = useState<FieldWidths>(DEFAULT_FIELD_WIDTHS);

  // Column widths are a per-user preference (user_metadata, same mechanism
  // as the sidebar width) — loaded once, applied to every field being
  // added/edited in this builder.
  useEffect(() => {
    async function loadWidths() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const saved = user?.user_metadata?.onboarding_builder_widths as Partial<FieldWidths> | undefined;
      if (saved) setWidths((prev) => ({ ...prev, ...saved }));
    }
    loadWidths();
  }, []);

  function resizeWidth(key: keyof FieldWidths, width: number) {
    setWidths((prev) => ({ ...prev, [key]: width }));
  }

  async function commitWidth(key: keyof FieldWidths, width: number) {
    const next = { ...widths, [key]: width };
    setWidths(next);
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { onboarding_builder_widths: next } });
  }

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("onboarding_form_fields")
      .select(
        "id, key, label, field_type, options, allow_other, other_label, required, position, mask, width, rows, download_path, download_filename"
      )
      .eq("form_id", formId)
      .order("position", { ascending: true });
    setFields((data as OnboardingField[] | null) ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setFields runs after an await, not synchronously
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  async function handleCreate(draft: FieldDraft) {
    setErrorMsg(null);
    setBusy("new");
    const supabase = createClient();
    const { error } = await supabase.from("onboarding_form_fields").insert({
      tenant_id: tenantId,
      form_id: formId,
      key: slugify(draft.label),
      label: draft.label,
      field_type: draft.field_type,
      options: draft.options,
      allow_other: draft.allow_other,
      other_label: draft.other_label,
      required: draft.required,
      mask: draft.mask,
      download_path: draft.download_path,
      download_filename: draft.download_filename,
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
        field_type: draft.field_type,
        options: draft.options,
        allow_other: draft.allow_other,
        other_label: draft.other_label,
        required: draft.required,
        mask: draft.mask,
        download_path: draft.download_path,
        download_filename: draft.download_filename,
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
    setConfirmDeleteId(null);
    load();
  }

  // Drag-and-drop reorder: apply optimistically, then persist only the rows
  // whose position actually changed.
  async function handleReorder(from: number, to: number) {
    if (!fields) return;
    const oldPos = new Map(fields.map((f) => [f.id, f.position]));
    const next = reorder(fields, from, to).map((f, i) => ({ ...f, position: i }));
    setFields(next);
    const supabase = createClient();
    await Promise.all(
      next
        .filter((f) => oldPos.get(f.id) !== f.position)
        .map((f) =>
          supabase.from("onboarding_form_fields").update({ position: f.position }).eq("id", f.id)
        )
    );
  }

  const { dragIndex, overIndex, dragProps } = useDragReorder(handleReorder);

  const typeLabels: Record<OnboardingFieldType, string> = {
    text: t("onboardingFieldTypeText"),
    textarea: t("onboardingFieldTypeTextarea"),
    number: t("onboardingFieldTypeNumber"),
    boolean: t("onboardingFieldTypeBoolean"),
    date: t("onboardingFieldTypeDate"),
    select: t("onboardingFieldTypeSelect"),
    multiselect: t("onboardingFieldTypeMultiselect"),
    file: t("onboardingFieldTypeFile"),
    download: t("onboardingFieldTypeDownload"),
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
            tenantId={tenantId}
            formId={formId}
            saving={busy === field.id}
            onCancel={() => setEditingId(null)}
            onSave={(draft) => handleUpdate(field.id, draft)}
            widths={widths}
            onResizeWidth={resizeWidth}
            onCommitWidth={commitWidth}
          />
        ) : (
          <div
            key={field.id}
            {...dragProps(idx)}
            className={`flex cursor-grab flex-col gap-3 rounded-[10px] border bg-(--bg-surface) p-4 transition-colors active:cursor-grabbing sm:flex-row sm:items-center sm:justify-between ${
              overIndex === idx && dragIndex !== idx
                ? "border-(--brand-500)"
                : "border-(--border-default)"
            } ${dragIndex === idx ? "opacity-50" : ""}`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <GripVertical
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-(--ink-soft)"
              />
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
              {field.mask && (
                <p className="font-mono text-[12px] text-(--ink-soft)">{field.mask}</p>
              )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={busy === field.id}
                onClick={() => setEditingId(field.id)}
                title={t("onboardingFieldEdit")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--ink) transition-colors hover:bg-(--accent-soft)"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
              {confirmDeleteId === field.id ? (
                <>
                  <button
                    type="button"
                    disabled={busy === field.id}
                    onClick={() => handleDelete(field.id)}
                    className="inline-flex h-8 items-center rounded-md bg-(--danger-500) px-3 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {t("onboardingFormDeleteConfirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-3 text-[12.5px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                  >
                    {t("onboardingFieldCancel")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy === field.id}
                  onClick={() => setConfirmDeleteId(field.id)}
                  title={t("onboardingFieldDelete")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        )
      )}

      {adding ? (
        <FieldEditor
          initial={null}
          tenantId={tenantId}
          formId={formId}
          saving={busy === "new"}
          onCancel={() => setAdding(false)}
          onSave={handleCreate}
          widths={widths}
          onResizeWidth={resizeWidth}
          onCommitWidth={commitWidth}
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
