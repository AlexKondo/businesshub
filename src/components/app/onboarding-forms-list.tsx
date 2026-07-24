"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Settings2, Pencil, Trash2, GripVertical } from "lucide-react";
import { reorder, useDragReorder } from "@/lib/use-drag-reorder";
import type { OnboardingForm } from "@/lib/onboarding-fields";

type FormRow = OnboardingForm & { fieldCount: number };

export function OnboardingFormsList({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [forms, setForms] = useState<FormRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: formRows } = await supabase
      .from("onboarding_forms")
      .select("id, tenant_id, name, position, active, header_text, footer_text")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });
    const rows = formRows ?? [];
    const { data: fieldRows } = rows.length
      ? await supabase
          .from("onboarding_form_fields")
          .select("form_id")
          .in(
            "form_id",
            rows.map((f) => f.id)
          )
      : { data: [] as { form_id: string }[] | null };
    const counts = new Map<string, number>();
    for (const row of fieldRows ?? []) counts.set(row.form_id, (counts.get(row.form_id) ?? 0) + 1);
    setForms(rows.map((f) => ({ ...f, fieldCount: counts.get(f.id) ?? 0 })));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setForms runs after an await, not synchronously
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const name = nameDraft.trim();
    if (!name) return;
    setBusy("new");
    const supabase = createClient();
    await supabase.from("onboarding_forms").insert({
      tenant_id: tenantId,
      name,
      position: forms?.length ?? 0,
    });
    setBusy(null);
    setCreating(false);
    setNameDraft("");
    load();
  }

  async function handleRename(id: string) {
    const name = renameDraft.trim();
    if (!name) return;
    setBusy(id);
    const supabase = createClient();
    await supabase.from("onboarding_forms").update({ name }).eq("id", id);
    setBusy(null);
    setRenamingId(null);
    load();
  }

  async function handleToggleActive(id: string, active: boolean) {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("onboarding_forms").update({ active }).eq("id", id);
    setBusy(null);
    load();
  }

  async function handleDelete(id: string) {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("onboarding_forms").delete().eq("id", id);
    setBusy(null);
    setConfirmDeleteId(null);
    load();
  }

  // Drag-and-drop reorder: apply optimistically, then persist only the rows
  // whose position actually changed.
  async function handleReorder(from: number, to: number) {
    if (!forms) return;
    const oldPos = new Map(forms.map((f) => [f.id, f.position]));
    const next = reorder(forms, from, to).map((f, i) => ({ ...f, position: i }));
    setForms(next);
    const supabase = createClient();
    await Promise.all(
      next
        .filter((f) => oldPos.get(f.id) !== f.position)
        .map((f) => supabase.from("onboarding_forms").update({ position: f.position }).eq("id", f.id))
    );
  }

  const { dragIndex, overIndex, dragProps } = useDragReorder(handleReorder);

  if (forms === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {forms.length === 0 && !creating && (
        <p className="text-[13.5px] text-(--ink-soft)">{t("onboardingFormsEmpty")}</p>
      )}

      {forms.map((form, index) =>
        renamingId === form.id ? (
          <div
            key={form.id}
            className="flex flex-wrap items-center gap-2 rounded-[10px] border border-(--brand-500)/30 bg-(--accent-soft) p-4"
          >
            <input
              type="text"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename(form.id)}
              className="h-9 flex-1 rounded-md border border-(--border-default) bg-(--bg-canvas) px-2.5 text-[13px] text-(--ink) outline-none focus:border-(--brand-500)"
            />
            <button
              type="button"
              disabled={busy === form.id || !renameDraft.trim()}
              onClick={() => handleRename(form.id)}
              className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("onboardingFieldSave")}
            </button>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-surface)"
            >
              {t("onboardingFieldCancel")}
            </button>
          </div>
        ) : (
          <div
            key={form.id}
            {...dragProps(index)}
            className={`flex cursor-grab flex-col gap-3 rounded-[10px] border bg-(--bg-surface) p-4 transition-colors active:cursor-grabbing sm:flex-row sm:items-center sm:justify-between ${
              overIndex === index && dragIndex !== index
                ? "border-(--brand-500)"
                : "border-(--border-default)"
            } ${dragIndex === index ? "opacity-50" : ""}`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <GripVertical
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-(--ink-soft)"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-(--ink)">{form.name}</p>
                <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.active}
                  disabled={busy === form.id}
                  onClick={() => handleToggleActive(form.id, !form.active)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    form.active ? "bg-(--brand-500)" : "bg-(--border-default)"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      form.active ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
                <span className="text-[12px] text-(--ink-soft)">
                  {form.active ? t("onboardingFormActiveLabel") : t("onboardingFormInactiveLabel")}
                  {" · "}
                  {t("onboardingFormFieldsCount", { count: form.fieldCount })}
                </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/suppliers/onboarding-form/${form.id}`}
                title={t("onboardingFormOpenButton")}
                draggable={false}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-(--brand-500) text-white transition-opacity hover:opacity-90"
              >
                <Settings2 size={15} strokeWidth={1.75} />
              </Link>
              <button
                type="button"
                disabled={busy === form.id}
                onClick={() => {
                  setRenamingId(form.id);
                  setRenameDraft(form.name);
                }}
                title={t("onboardingFormRename")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--ink) transition-colors hover:bg-(--accent-soft)"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
              {confirmDeleteId === form.id ? (
                <>
                  <button
                    type="button"
                    disabled={busy === form.id}
                    onClick={() => handleDelete(form.id)}
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
                  disabled={busy === form.id}
                  onClick={() => setConfirmDeleteId(form.id)}
                  title={t("onboardingFormDelete")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        )
      )}

      {confirmDeleteId && (
        <p className="text-[11.5px] text-(--danger-500)">{t("onboardingFormDeleteWarning")}</p>
      )}

      {creating ? (
        <div className="flex flex-col gap-3 rounded-[10px] border border-(--brand-500)/30 bg-(--accent-soft) p-4">
          <label className="text-[12.5px] font-medium text-(--ink)">
            {t("onboardingFormNameInputLabel")}
          </label>
          <input
            type="text"
            autoFocus
            value={nameDraft}
            placeholder={t("onboardingFormNamePlaceholder")}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="h-9 rounded-md border border-(--border-default) bg-(--bg-canvas) px-2.5 text-[13px] text-(--ink) outline-none focus:border-(--brand-500)"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy === "new" || !nameDraft.trim()}
              onClick={handleCreate}
              className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("onboardingFormCreate")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNameDraft("");
              }}
              className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-surface)"
            >
              {t("onboardingFieldCancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-9 w-fit items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
        >
          {t("onboardingFormsCreateButton")}
        </button>
      )}
    </div>
  );
}
