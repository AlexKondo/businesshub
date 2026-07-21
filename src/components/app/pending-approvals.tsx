"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type PendingMember = {
  id: string;
  createdAt: string;
  email: string;
  fullName: string;
};

type RoleOption = { id: string; name: string };

export function PendingApprovals() {
  const t = useTranslations("adminPage");
  const [pending, setPending] = useState<PendingMember[] | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [pendingRes, supabase] = [await fetch("/api/tenants/pending-members"), createClient()];
    const { pending: list } = await pendingRes.json();
    setPending(list);

    const { data: roleRows } = await supabase
      .from("roles")
      .select("id, name")
      .is("tenant_id", null)
      .neq("name", "Administrador Global");
    setRoles(roleRows ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(membershipId: string) {
    const roleId = selectedRole[membershipId];
    if (!roleId) return;
    setBusy(membershipId);
    const supabase = createClient();
    await supabase
      .from("memberships")
      .update({ role_id: roleId, status: "active" })
      .eq("id", membershipId);
    setBusy(null);
    load();
  }

  async function reject(membershipId: string) {
    setBusy(membershipId);
    const supabase = createClient();
    await supabase.from("memberships").delete().eq("id", membershipId);
    setBusy(null);
    load();
  }

  if (pending === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  if (pending.length === 0) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("noPending")}</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {pending.map((member) => (
        <div
          key={member.id}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[14px] font-semibold text-(--ink)">{member.fullName}</p>
            <p className="text-[12.5px] text-(--ink-soft)">{member.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedRole[member.id] ?? ""}
              onChange={(e) =>
                setSelectedRole((prev) => ({ ...prev, [member.id]: e.target.value }))
              }
              className="h-9 rounded-md border border-(--border-default) bg-(--bg-canvas) px-2 text-[13px] text-(--ink) outline-none focus:border-(--brand-500)"
            >
              <option value="">{t("selectRole")}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedRole[member.id] || busy === member.id}
              onClick={() => approve(member.id)}
              className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("approve")}
            </button>
            <button
              type="button"
              disabled={busy === member.id}
              onClick={() => reject(member.id)}
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
