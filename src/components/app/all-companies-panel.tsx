"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Company = {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  taxId: string;
  status: "active" | "pending_approval";
  createdAt: string;
  memberCount: number;
};

export function AllCompaniesPanel() {
  const t = useTranslations("adminPage");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
  }, []);

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

  if (loadError) {
    return <p className="text-[13.5px] text-(--danger-500)">{t("allCompaniesLoadError")}</p>;
  }

  if (companies === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (companies.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("allCompaniesEmpty")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {companies.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-(--ink)">
                {c.name} <span className="font-normal text-(--ink-soft)">· {c.slug}</span>
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  c.status === "active"
                    ? "bg-(--success-500)/10 text-(--success-500)"
                    : "bg-(--warning-500)/10 text-(--warning-500)"
                }`}
              >
                {c.status === "active"
                  ? t("allCompaniesStatusActive")
                  : t("allCompaniesStatusPending")}
              </span>
            </div>
            <p className="text-[12.5px] text-(--ink-soft)">
              {c.legalName} · {c.taxId}
            </p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {t("allCompaniesMemberCount", { count: c.memberCount })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {confirmDeleteId === c.id ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy === c.id}
                  onClick={() => handleDelete(c.id)}
                  className="inline-flex h-9 items-center rounded-md bg-(--danger-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t("onboardingFormDeleteConfirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                >
                  {t("onboardingFieldCancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy === c.id}
                onClick={() => setConfirmDeleteId(c.id)}
                className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
              >
                {t("onboardingFormDelete")}
              </button>
            )}
            {confirmDeleteId === c.id && (
              <p className="max-w-[220px] text-right text-[11px] text-(--danger-500)">
                {t("allCompaniesDeleteWarning")}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
