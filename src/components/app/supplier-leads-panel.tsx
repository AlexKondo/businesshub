"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export function SupplierLeadsPanel({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("supplier_leads")
      .select("id, contact_name, company_name, email, phone, status, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setLeads((data as Lead[] | null) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(leadId: string, status: "approved" | "rejected") {
    setBusy(leadId);
    const supabase = createClient();
    await supabase.from("supplier_leads").update({ status }).eq("id", leadId);
    setBusy(null);
    load();
  }

  if (leads === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (leads.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("noLeads")}</p>;
  }

  const statusLabel: Record<Lead["status"], string> = {
    pending: t("leadStatusPending"),
    approved: t("leadStatusApproved"),
    rejected: t("leadStatusRejected"),
  };
  const statusClass: Record<Lead["status"], string> = {
    pending: "text-(--warning-500)",
    approved: "text-(--success-500)",
    rejected: "text-(--ink-soft)",
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-(--ink)">{lead.contact_name}</p>
              <span className={`text-[11px] font-semibold uppercase ${statusClass[lead.status]}`}>
                {statusLabel[lead.status]}
              </span>
            </div>
            <p className="text-[12.5px] text-(--ink-soft)">
              {lead.company_name} · {lead.email} · {lead.phone}
            </p>
          </div>
          {lead.status === "pending" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy === lead.id}
                onClick={() => setStatus(lead.id, "approved")}
                className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {t("approve")}
              </button>
              <button
                type="button"
                disabled={busy === lead.id}
                onClick={() => setStatus(lead.id, "rejected")}
                className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
              >
                {t("reject")}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
