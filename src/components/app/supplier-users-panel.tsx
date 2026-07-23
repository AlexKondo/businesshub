"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type SupplierForm = { id: string; name: string };

type SupplierUser = {
  membershipId: string;
  createdAt: string;
  email: string;
  fullName: string;
  submittedFormIds: string[];
};

export function SupplierUsersPanel({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [users, setUsers] = useState<SupplierUser[] | null>(null);
  const [forms, setForms] = useState<SupplierForm[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tenants/supplier-users?tenantId=${tenantId}`);
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setForms(data.forms ?? []);
    }
    load();
  }, [tenantId]);

  if (loadError) {
    return <p className="text-[13.5px] text-(--danger-500)">{t("supplierUsersLoadError")}</p>;
  }

  if (users === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (users.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("supplierUsersEmpty")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {users.map((u) => (
        <div
          key={u.membershipId}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[14px] font-semibold text-(--ink)">{u.fullName}</p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {u.email} ·{" "}
              {t("supplierUsersSignedUpAt", {
                date: new Date(u.createdAt).toLocaleDateString(),
              })}
            </p>
          </div>
          {forms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {forms.map((form) => {
                const submitted = u.submittedFormIds.includes(form.id);
                return (
                  <span
                    key={form.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      submitted
                        ? "bg-(--success-500)/10 text-(--success-500)"
                        : "bg-(--warning-500)/10 text-(--warning-500)"
                    }`}
                  >
                    {form.name} ·{" "}
                    {submitted ? t("supplierUsersFormSubmitted") : t("supplierUsersFormPending")}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
