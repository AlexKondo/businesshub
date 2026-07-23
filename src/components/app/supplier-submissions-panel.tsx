"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Trash2, MessageCircle, ChevronDown, ChevronRight } from "lucide-react";
import type { OnboardingField, OnboardingAnswers, OnboardingForm } from "@/lib/onboarding-fields";

type Submission = {
  id: string;
  membershipId: string;
  status: "active" | "disabled";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<Submission | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

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

  async function loadSubmissions() {
    if (!selectedFormId) return;
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-change: setFields/setSubmissions ultimately run after an await inside loadSubmissions
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId, tenantId]);

  async function handleToggleActive(membershipId: string, active: boolean) {
    setBusyId(membershipId);
    await fetch("/api/tenants/toggle-supplier-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, membershipId, active }),
    });
    setBusyId(null);
    loadSubmissions();
  }

  async function handleDelete(membershipId: string) {
    setBusyId(membershipId);
    await fetch("/api/tenants/delete-supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, membershipId }),
    });
    setBusyId(null);
    setConfirmDeleteId(null);
    loadSubmissions();
  }

  async function handleSendMessage() {
    if (!messageTarget) return;
    setMessageBusy(true);
    await fetch("/api/tenants/message-supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        membershipId: messageTarget.membershipId,
        message: messageBody,
      }),
    });
    setMessageBusy(false);
    setMessageSent(true);
  }

  function closeMessage() {
    setMessageTarget(null);
    setMessageBody("");
    setMessageSent(false);
  }

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
        {submissions.map((submission) => {
          const expanded = expandedId === submission.id;
          return (
            <div
              key={submission.id}
              className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : submission.id)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  {expanded ? (
                    <ChevronDown size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-(--ink-soft)" />
                  ) : (
                    <ChevronRight size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-(--ink-soft)" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-(--ink)">{submission.fullName}</p>
                    <p className="text-[12.5px] text-(--ink-soft)">
                      {submission.email} ·{" "}
                      {t("submissionsUpdatedAt", {
                        date: new Date(submission.updatedAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                </button>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11.5px] text-(--ink-soft)">
                      {t("supplierUsersActiveLabel")}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={submission.status === "active"}
                      disabled={busyId === submission.membershipId}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(submission.membershipId, submission.status !== "active");
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                        submission.status === "active" ? "bg-(--brand-500)" : "bg-(--border-default)"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          submission.status === "active" ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMessageTarget(submission);
                    }}
                    title={t("supplierSubmissionsMessage")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--ink-soft) transition-colors hover:bg-(--accent-soft) hover:text-(--ink)"
                  >
                    <MessageCircle size={14} strokeWidth={1.75} />
                  </button>

                  {confirmDeleteId === submission.membershipId ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === submission.membershipId}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(submission.membershipId);
                        }}
                        className="inline-flex h-8 items-center rounded-md bg-(--danger-500) px-2.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        {t("onboardingFormDeleteConfirm")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-2.5 text-[12px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                      >
                        {t("onboardingFieldCancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(submission.membershipId);
                      }}
                      title={t("onboardingFormDelete")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-(--border-default) pt-3 sm:grid-cols-2">
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
              )}
            </div>
          );
        })}
      </div>

      {messageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            {messageSent ? (
              <>
                <p className="text-[14px] font-semibold text-(--ink)">
                  {t("supplierSubmissionsMessageSentTitle")}
                </p>
                <button
                  type="button"
                  onClick={closeMessage}
                  className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-(--border-default) text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                >
                  {t("onboardingFieldCancel")}
                </button>
              </>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-(--ink)">
                  {t("supplierSubmissionsMessageTitle", { name: messageTarget.fullName })}
                </p>
                <div className="mt-3 flex gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-(--brand-500)/10 px-2.5 py-1 text-[11px] font-medium text-(--brand-500)">
                    {t("supplierSubmissionsMessageChannelEmail")}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-(--ink-soft)/10 px-2.5 py-1 text-[11px] font-medium text-(--ink-soft)">
                    {t("supplierSubmissionsMessageChannelWhatsapp")}
                  </span>
                </div>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={4}
                  placeholder={t("supplierSubmissionsMessagePlaceholder")}
                  className="mt-3 w-full resize-none rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 py-2 text-[13.5px] text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeMessage}
                    className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                  >
                    {t("onboardingFieldCancel")}
                  </button>
                  <button
                    type="button"
                    disabled={messageBusy || !messageBody.trim()}
                    onClick={handleSendMessage}
                    className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {messageBusy
                      ? t("supplierSubmissionsMessageSending")
                      : t("supplierSubmissionsMessageSend")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
