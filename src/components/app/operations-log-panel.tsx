"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  actorName: string | null;
  companyName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function OperationsLogPanel({ tenantId }: { tenantId: string | null }) {
  const t = useTranslations("operationsLogPage");
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [global, setGlobal] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    const res = await fetch(
      tenantId ? `/api/tenants/audit-log?tenantId=${tenantId}` : "/api/tenants/audit-log"
    );
    if (!res.ok) {
      setLoadError(true);
      return;
    }
    const data = await res.json();
    setEntries(data.entries ?? []);
    setGlobal(!!data.global);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: state set after an await, not synchronously
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  if (loadError) {
    return <p className="mt-4 text-[13.5px] text-(--danger-500)">{t("loadError")}</p>;
  }

  if (entries === null) {
    return <p className="mt-4 text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (entries.length === 0) {
    return <p className="mt-4 text-[13.5px] text-(--ink-soft)">{t("empty")}</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[10px] border border-(--border-default)">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-(--border-default) bg-(--bg-surface)">
            <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("colAction")}
            </th>
            {global && (
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
                {t("colCompany")}
              </th>
            )}
            <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("colActor")}
            </th>
            <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("colWhen")}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-(--border-default) last:border-b-0">
              <td className="px-4 py-2.5 align-top">
                <span className="font-mono text-[12.5px] font-medium text-(--ink)">{e.action}</span>
              </td>
              {global && (
                <td className="px-4 py-2.5 align-top text-[12.5px] text-(--ink-soft)">
                  {e.companyName ?? "—"}
                </td>
              )}
              <td className="px-4 py-2.5 align-top text-[12.5px] text-(--ink-soft)">
                {e.actorName ?? "—"}
              </td>
              <td className="px-4 py-2.5 align-top text-[12.5px] whitespace-nowrap text-(--ink-soft)">
                {new Date(e.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
