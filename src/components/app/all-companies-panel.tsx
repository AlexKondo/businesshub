"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronRight } from "lucide-react";

// Only this account gets the "enter as" navigation shortcut for now — not
// every platform admin. Platform admins already have full access to any
// tenant via proxy.ts's is_platform_admin() bypass; this is purely a
// convenience link, deliberately scoped narrow while it's new.
const ENTER_AS_ALLOWED_EMAIL = "alexandre.kondo@gmail.com";

type Company = {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  taxId: string;
  status: "active" | "pending_approval" | "inactive";
  createdAt: string;
  memberCount: number;
};

type CompanyMember = {
  membershipId: string;
  status: string;
  createdAt: string;
  roleName: string | null;
  email: string;
  fullName: string;
};

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function AllCompaniesPanel() {
  const t = useTranslations("adminPage");
  const locale = useLocale();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<CompanyMember[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);

  async function load() {
    const res = await fetch("/api/tenants/all-companies");
    if (!res.ok) {
      setLoadError(true);
      return;
    }
    const data = await res.json();
    setCompanies(data.companies ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setCompanies runs after an await, not synchronously
    load();
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setCurrentEmail(user?.email ?? null));
  }, []);

  async function toggleExpanded(companyId: string) {
    if (expandedId === companyId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(companyId);
    setMembers(null);
    setAuditLog(null);
    const res = await fetch(`/api/tenants/company-detail?companyId=${companyId}`);
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members ?? []);
    setAuditLog(data.auditLog ?? []);
  }

  async function handleDelete(companyId: string) {
    setBusy(companyId);
    await fetch("/api/tenants/delete-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    setBusy(null);
    setConfirmDeleteId(null);
    load();
  }

  async function handleToggleActive(companyId: string, active: boolean) {
    setBusy(companyId);
    await fetch("/api/tenants/toggle-company-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, active }),
    });
    setBusy(null);
    load();
  }

  function enterAs(slug: string) {
    const root = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");
    window.location.href = `https://${slug}.${root}/${locale}/dashboard`;
  }

  if (loadError) {
    return <p className="text-[13.5px] text-(--danger-500)">{t("allCompaniesLoadError")}</p>;
  }

  if (companies === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (companies.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("allCompaniesEmpty")}</p>;
  }

  const statusStyles: Record<Company["status"], string> = {
    active: "bg-(--success-500)/10 text-(--success-500)",
    pending_approval: "bg-(--warning-500)/10 text-(--warning-500)",
    inactive: "bg-(--ink-soft)/10 text-(--ink-soft)",
  };
  const statusLabels: Record<Company["status"], string> = {
    active: t("allCompaniesStatusActive"),
    pending_approval: t("allCompaniesStatusPending"),
    inactive: t("allCompaniesStatusInactive"),
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      {companies.map((c) => {
        const expanded = expandedId === c.id;
        return (
          <div
            key={c.id}
            className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => toggleExpanded(c.id)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                {expanded ? (
                  <ChevronDown size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-(--ink-soft)" />
                ) : (
                  <ChevronRight size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-(--ink-soft)" />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-(--ink)">
                      {c.name} <span className="font-normal text-(--ink-soft)">· {c.slug}</span>
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[c.status]}`}
                    >
                      {statusLabels[c.status]}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-(--ink-soft)">
                    {c.legalName} · {c.taxId}
                  </p>
                  <p className="text-[12.5px] text-(--ink-soft)">
                    {t("allCompaniesMemberCount", { count: c.memberCount })}
                  </p>
                </div>
              </button>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {currentEmail === ENTER_AS_ALLOWED_EMAIL && c.status !== "pending_approval" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        enterAs(c.slug);
                      }}
                      className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                    >
                      {t("allCompaniesEnterAs")}
                    </button>
                  )}
                  {c.status !== "pending_approval" && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.status === "active"}
                      disabled={busy === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(c.id, c.status !== "active");
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                        c.status === "active" ? "bg-(--brand-500)" : "bg-(--border-default)"
                      }`}
                      title={t("allCompaniesDeactivate")}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          c.status === "active" ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>
                  )}
                  {confirmDeleteId === c.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                        className="inline-flex h-9 items-center rounded-md bg-(--danger-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        {t("onboardingFormDeleteConfirm")}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                      >
                        {t("onboardingFieldCancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(c.id);
                      }}
                      className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
                    >
                      {t("onboardingFormDelete")}
                    </button>
                  )}
                </div>
                {confirmDeleteId === c.id && (
                  <p className="max-w-[260px] text-right text-[11px] text-(--danger-500)">
                    {t("allCompaniesDeleteWarning")}
                  </p>
                )}
              </div>
            </div>

            {expanded && (
              <div className="ml-6 flex flex-col gap-4 border-t border-(--border-default) pt-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                    {t("allCompaniesMembersTitle")}
                  </p>
                  {members === null ? (
                    <p className="mt-2 text-[13px] text-(--ink-soft)">{t("loading")}</p>
                  ) : members.length === 0 ? (
                    <p className="mt-2 text-[13px] text-(--ink-soft)">{t("allCompaniesNoMembers")}</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {members.map((m) => (
                        <div key={m.membershipId} className="text-[12.5px] text-(--ink)">
                          <span className="font-medium">{m.fullName}</span>{" "}
                          <span className="text-(--ink-soft)">
                            ({m.email}) · {m.roleName ?? "—"} · {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                    {t("allCompaniesAuditLogTitle")}
                  </p>
                  {auditLog === null ? (
                    <p className="mt-2 text-[13px] text-(--ink-soft)">{t("loading")}</p>
                  ) : auditLog.length === 0 ? (
                    <p className="mt-2 text-[13px] text-(--ink-soft)">{t("allCompaniesNoAuditLog")}</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {auditLog.map((entry) => (
                        <div key={entry.id} className="text-[12.5px] text-(--ink)">
                          <span className="font-medium">{entry.action}</span>{" "}
                          <span className="text-(--ink-soft)">
                            · {entry.actorName ?? "—"} ·{" "}
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
