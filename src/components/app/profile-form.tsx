"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({
  userId,
  email,
  fullName,
}: {
  userId: string;
  email: string;
  fullName: string;
}) {
  const t = useTranslations("profilePage");
  const tv = useTranslations("auth.validation");
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = z.object({
    fullName: z.string().min(1, tv("nameRequired")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { fullName }, resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSaved(false);
    const supabase = createClient();
    await Promise.all([
      supabase.auth.updateUser({ data: { full_name: values.fullName } }),
      supabase.from("profiles").update({ full_name: values.fullName }).eq("id", userId),
    ]);
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 flex max-w-[420px] flex-col gap-4 rounded-xl border border-(--border-default) bg-(--bg-surface) p-6"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-[13px] font-medium text-(--ink)">
          {t("nameLabel")}
        </label>
        <input
          id="fullName"
          type="text"
          {...register("fullName")}
          className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
        />
        {errors.fullName && (
          <span className="text-xs text-(--danger-500)">{errors.fullName.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-medium text-(--ink)">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink-soft) opacity-60"
        />
        <span className="text-xs text-(--ink-soft)">{t("emailHint")}</span>
      </div>

      <div className="mt-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? t("saving") : t("save")}
        </button>
        {saved && <span className="text-[13px] text-(--success-500)">{t("saved")}</span>}
      </div>
    </form>
  );
}
