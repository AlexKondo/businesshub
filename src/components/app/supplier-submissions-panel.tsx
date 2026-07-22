"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingField, OnboardingAnswers, OnboardingForm } from "@/lib/onboarding-fields";

type Submission = {
  id: string;
  updatedAt: string;
  answers: OnboardingAnswers;
  email: string;
  fullName: string;
};

export function SupplierSubmissionsPanel({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [forms, setForms] = useState<OnboardingForm[] | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [fields, setFields] = useState<OnboardingField[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    async function loadForms() {
      const supabase = createClient();
      const { data } = await supabase
        .from("onboarding_forms")
        .select("id, tenant_id, name, position, active")
        .eq("tenant_id", tenantId)
        .order("position", { ascending: true });
      setForms(data ?? []);
      setSelectedFormId((data && data[0]?.id) ?? null);
    }
    loadForms();
  }, [tenantId]);

  useEffect(() => {
    if (!selectedFormId) return;
    async function load() {
      setFields(null);
      setSubmissions(null);
      const supabase = createClient();
      const [{ data: fieldRows }, submissionsRes] = await Promise.all([
        supabase
          .from("onboarding_form_fields")
          .select("id, key, label, field_type, options, allow_other, required, position")
          .eq("form_id", selectedFormId as string)
          .order("position", { ascending: true }),
        fetch(`/api/tenants/supplier-submissions?tenantId=${tenantId}&formId=${selectedFormId}`),
      ]);
      setFields((fieldRows as OnboardingField[] | null) ?? []);
      const { submissions: list } = await submissionsRes.json();
      setSubmissions(list ?? []);
    }
    load();
  }, [selectedFormId, tenantId]);

  if (forms === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (forms.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("submissionsEmpty")}</p>;
  }

  const tabs = forms.length > 1 && (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {forms.map((form) => (
        <button
          key={form.id}
          type="button"
          onClick={() => setSelectedFormId(form.id)}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-medium transition-colors ${
            selectedFormId === form.id
              ? "bg-(--brand-500) text-white"
              : "border border-(--border-default) text-(--ink-soft) hover:bg-(--accent-soft)"
          }`}
        >
          {form.name}
        </button>
      ))}
    </div>
  );

  if (fields === null || submissions === null) {
    return (
      <div>
        {tabs}
        <p className="mt-4 text-[13.5px] text-(--ink-soft)">{t("loading")}</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div>
        {tabs}
        <p className="mt-4 text-[13.5px] text-(--ink-soft)">{t("submissionsEmpty")}</p>
      </div>
    );
  }

  const fieldByKey = new Map(fields.map((f) => [f.key, f]));

  function formatAnswer(field: OnboardingField | undefined, value: unknown): string {
    if (value === undefined || value === null || value === "") return t("submissionsNoAnswer");
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : t("submissionsNoAnswer");
    }
    if (typeof value === "boolean") return value ? "✓" : "—";
    if (field?.field_type === "select") {
      const match = field.options.find((o) => o.value === value);
      return match?.label ?? String(value);
    }
    return String(value);
  }

  return (
    <div>
      {tabs}
      <div className="mt-4 flex flex-col gap-3">
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4"
        >
          <div>
            <p className="text-[14px] font-semibold text-(--ink)">{submission.fullName}</p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {submission.email} ·{" "}
              {t("submissionsUpdatedAt", {
                date: new Date(submission.updatedAt).toLocaleDateString(),
              })}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {[...fields]
              .sort((a, b) => a.position - b.position)
              .map((field) => (
                <div key={field.id} className="text-[12.5px]">
                  <span className="text-(--ink-soft)">{field.label}: </span>
                  <span className="font-medium text-(--ink)">
                    {formatAnswer(fieldByKey.get(field.key), submission.answers[field.key])}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
