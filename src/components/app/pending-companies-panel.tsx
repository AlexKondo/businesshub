"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type PendingCompany = {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  slug: string;
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
};

export function PendingCompaniesPanel() {
  const t = useTranslations("adminPage");
  const [companies, setCompanies] = useState<PendingCompany[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    const res = await fetch("/api/tenants/pending-companies");
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

  async function review(companyId: string, action: "approve" | "reject") {
    setBusy(companyId);
    await fetch("/api/tenants/review-company-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, action }),
    });
    setBusy(null);
    load();
  }

  if (loadError) {
    return <p className="text-[13.5px] text-(--danger-500)">{t("pendingCompaniesLoadError")}</p>;
  }

  if (companies === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (companies.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("pendingCompaniesEmpty")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {companies.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[14px] font-semibold text-(--ink)">
              {c.name} <span className="font-normal text-(--ink-soft)">· {c.slug}</span>
            </p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {c.legalName} · {c.taxId}
            </p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {t("pendingCompaniesRequestedBy", { name: c.requesterName, email: c.requesterEmail })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busy === c.id}
              onClick={() => review(c.id, "approve")}
              className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("approve")}
            </button>
            <button
              type="button"
              disabled={busy === c.id}
              onClick={() => review(c.id, "reject")}
              className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
            >
              {t("reject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
