"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tv = useTranslations("auth.validation");
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email(tv("emailInvalid")),
    password: z.string().min(8, tv("passwordMin")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError(
        error.status === 400 ? t("errorInvalid") : t("errorGeneric")
      );
      return;
    }
    const { data: membership } = await supabase
      .from("memberships")
      .select("companies(slug)")
      .limit(1)
      .maybeSingle<{ companies: { slug: string } | null }>();

    const slug = membership?.companies?.slug;
    if (slug) {
      const root = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");
      window.location.href = `https://${slug}.${root}/${locale}/dashboard`;
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-(--border-default) bg-(--bg-surface) p-7">
      <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">
        {t("title")}
      </h1>
      <p className="mt-1.5 text-[13.5px] text-(--ink-soft)">{t("subtitle")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[13px] font-medium text-(--ink)">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
          />
          {errors.email && (
            <span className="text-xs text-(--danger-500)">{errors.email.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-[13px] font-medium text-(--ink)">
              {t("passwordLabel")}
            </label>
            <span className="cursor-default text-xs text-(--ink-soft) hover:text-(--brand-500)">
              {t("forgotPassword")}
            </span>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
          />
          {errors.password && (
            <span className="text-xs text-(--danger-500)">{errors.password.message}</span>
          )}
        </div>

        {serverError && (
          <p className="rounded-md bg-(--danger-500)/10 px-3 py-2 text-xs text-(--danger-500)">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-(--ink-soft)">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-(--brand-500)">
          {t("signupLink")}
        </Link>
      </p>
    </div>
  );
}
