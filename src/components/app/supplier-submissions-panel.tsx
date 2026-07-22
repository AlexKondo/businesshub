"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingField, OnboardingAnswers } from "@/lib/onboarding-fields";

type Submission = {
  id: string;
  updatedAt: string;
  answers: OnboardingAnswers;
  email: string;
  fullName: string;
};

export function SupplierSubmissionsPanel({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [fields, setFields] = useState<OnboardingField[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: fieldRows }, submissionsRes] = await Promise.all([
        supabase
          .from("onboarding_form_fields")
          .select("id, key, label, field_type, options, allow_other, required, position")
          .eq("tenant_id", tenantId)
          .order("position", { ascending: true }),
        fetch(`/api/tenants/supplier-submissions?tenantId=${tenantId}`),
      ]);
      setFields((fieldRows as OnboardingField[] | null) ?? []);
      const { submissions: list } = await submissionsRes.json();
      setSubmissions(list ?? []);
    }
    load();
  }, [tenantId]);

  if (fields === null || submissions === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (submissions.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("submissionsEmpty")}</p>;
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
  );
}
