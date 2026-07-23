"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, Plus } from "lucide-react";

type SupplierForm = { id: string; name: string };

type SupplierUser = {
  membershipId: string;
  createdAt: string;
  status: "active" | "disabled";
  email: string;
  fullName: string;
  submittedFormIds: string[];
};

export function SupplierUsersPanel({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const locale = useLocale();
  const [users, setUsers] = useState<SupplierUser[] | null>(null);
  const [forms, setForms] = useState<SupplierForm[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);

  async function load() {
    const res = await fetch(`/api/tenants/supplier-users?tenantId=${tenantId}`);
    if (!res.ok) {
      setLoadError(true);
      return;
    }
    const data = await res.json();
    setUsers(data.users ?? []);
    setForms(data.forms ?? []);
    setCanManage(!!data.canManage);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setUsers runs after an await, not synchronously
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function handleToggleActive(membershipId: string, active: boolean) {
    setBusyId(membershipId);
    await fetch("/api/tenants/toggle-supplier-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, membershipId, active }),
    });
    setBusyId(null);
    load();
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
    load();
  }

  async function handleInvite() {
    setInviteBusy(true);
    setInviteError(null);
    const res = await fetch("/api/tenants/invite-supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, email: inviteEmail, locale }),
    });
    setInviteBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setInviteError(
        data.error === "already_registered"
          ? t("supplierUsersInviteAlreadyRegistered")
          : t("supplierUsersInviteError")
      );
      return;
    }
    setInviteSent(true);
    load();
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteError(null);
    setInviteSent(false);
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setInviteOpen(true)}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
    >
      <Plus size={15} strokeWidth={2} />
      {t("supplierUsersInviteButton")}
    </button>
  );

  const inviteModal = inviteOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
        {inviteSent ? (
          <>
            <p className="text-[14px] font-semibold text-(--ink)">
              {t("supplierUsersInviteSentTitle")}
            </p>
            <p className="mt-1.5 text-[13px] text-(--ink-soft)">
              {t("supplierUsersInviteSentBody", { email: inviteEmail })}
            </p>
            <button
              type="button"
              onClick={closeInvite}
              className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-(--border-default) text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
            >
              {t("ok")}
            </button>
          </>
        ) : (
          <>
            <p className="text-[14px] font-semibold text-(--ink)">
              {t("supplierUsersInviteTitle")}
            </p>
            <p className="mt-1 text-[12.5px] text-(--ink-soft)">
              {t("supplierUsersInviteSubtitle")}
            </p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="mt-3 h-10 w-full rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-[13.5px] text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
            />
            {inviteError && (
              <p className="mt-2 text-[12.5px] text-(--danger-500)">{inviteError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeInvite}
                className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
              >
                {t("onboardingFieldCancel")}
              </button>
              <button
                type="button"
                disabled={inviteBusy || !inviteEmail.includes("@")}
                onClick={handleInvite}
                className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {inviteBusy ? t("supplierUsersInviteSending") : t("supplierUsersInviteSubmit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (loadError) {
    return <p className="text-[13.5px] text-(--danger-500)">{t("supplierUsersLoadError")}</p>;
  }

  if (users === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  return (
    <div>
      {canManage && <div className="mt-4 flex justify-end">{addButton}</div>}
      {users.length === 0 ? (
        <p className="mt-4 text-[13.5px] text-(--ink-soft)">{t("supplierUsersEmpty")}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
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
              <div className="flex flex-wrap items-center gap-2">
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
                          {submitted
                            ? t("supplierUsersFormSubmitted")
                            : t("supplierUsersFormPending")}
                        </span>
                      );
                    })}
                  </div>
                )}
                {canManage && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11.5px] text-(--ink-soft)">
                        {t("supplierUsersActiveLabel")}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={u.status === "active"}
                        disabled={busyId === u.membershipId}
                        onClick={() => handleToggleActive(u.membershipId, u.status !== "active")}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                          u.status === "active" ? "bg-(--brand-500)" : "bg-(--border-default)"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            u.status === "active" ? "translate-x-[18px]" : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </span>
                    {confirmDeleteId === u.membershipId ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === u.membershipId}
                          onClick={() => handleDelete(u.membershipId)}
                          className="inline-flex h-8 items-center rounded-md bg-(--danger-500) px-2.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          {t("onboardingFormDeleteConfirm")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="inline-flex h-8 items-center rounded-md border border-(--border-default) px-2.5 text-[12px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
                        >
                          {t("onboardingFieldCancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(u.membershipId)}
                        title={t("onboardingFormDelete")}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-(--border-default) text-(--danger-500) transition-colors hover:bg-(--danger-500)/10"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {inviteModal}
    </div>
  );
}
