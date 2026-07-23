"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Settings = {
  showDashboard: boolean;
  showOnboardingForm: boolean;
  showUsers: boolean;
};

const DEFAULTS: Settings = {
  showDashboard: true,
  showOnboardingForm: true,
  showUsers: false,
};

export function FornecedorMenuSettingsPanel({ tenantId }: { tenantId: string }) {
  const t = useTranslations("adminPage");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("fornecedor_menu_settings")
        .select("show_dashboard, show_onboarding_form, show_users")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      setSettings(
        data
          ? {
              showDashboard: data.show_dashboard,
              showOnboardingForm: data.show_onboarding_form,
              showUsers: data.show_users,
            }
          : DEFAULTS
      );
    }
    load();
  }, [tenantId]);

  async function toggle(key: keyof Settings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    const supabase = createClient();
    await supabase.from("fornecedor_menu_settings").upsert({
      tenant_id: tenantId,
      show_dashboard: next.showDashboard,
      show_onboarding_form: next.showOnboardingForm,
      show_users: next.showUsers,
    });
    setSaving(false);
  }

  if (settings === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  const items: { key: keyof Settings; label: string }[] = [
    { key: "showDashboard", label: t("fornecedorMenuDashboard") },
    { key: "showOnboardingForm", label: t("fornecedorMenuOnboardingForm") },
    { key: "showUsers", label: t("fornecedorMenuUsers") },
  ];

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {items.map((item) => (
        <label
          key={item.key}
          className="flex items-center justify-between gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) px-4 py-3"
        >
          <span className="text-[13.5px] font-medium text-(--ink)">{item.label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings[item.key]}
            disabled={saving}
            onClick={() => toggle(item.key)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              settings[item.key] ? "bg-(--brand-500)" : "bg-(--border-default)"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                settings[item.key] ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </label>
      ))}
    </div>
  );
}
