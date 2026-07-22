"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
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
      .select("id, tenant_id, name, position")
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

  async function handleDelete(id: string) {
    setBusy(id);
    const supabase = createClient();
    await supabase.from("onboarding_forms").delete().eq("id", id);
    setBusy(null);
    setConfirmDeleteId(null);
    load();
  }

  if (forms === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {forms.length === 0 && !creating && (
        <p className="text-[13.5px] text-(--ink-soft)">{t("onboardingFormsEmpty")}</p>
      )}

      {forms.map((form) =>
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
            className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-(--ink)">{form.name}</p>
              <p className="text-[12px] text-(--ink-soft)">
                {t("onboardingFormFieldsCount", { count: form.fieldCount })}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/suppliers/onboarding-form/${form.id}`}
                className="inline-flex h-8 items-center rounded-md bg-(--brand-500) px-3 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t("onboardingFormOpenButton")}
              </Link>
              <button
                type="button"
                disabled={busy === form.id}
                onClick={() => {
                  setRenamingId(form.id);
                  setRenameDraft(form.name);
                }}
                className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-3 text-[12.5px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
              >
                {t("onboardingFormRename")}
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
                  className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-3 text-[12.5px] font-medium text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
                >
                  {t("onboardingFormDelete")}
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
