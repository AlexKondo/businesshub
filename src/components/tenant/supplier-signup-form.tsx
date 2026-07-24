"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";

export function SupplierSignupForm({
  tenantId,
  companyName,
}: {
  tenantId: string;
  companyName: string;
}) {
  const t = useTranslations("tenantLanding");
  const tv = useTranslations("auth.validation");
  const ts = useTranslations("auth.signup");
  const locale = useLocale();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    contactName: z.string().min(2, tv("nameRequired")),
    companyNameInput: z.string().min(2, t("companyNameTooShort")),
    email: z.string().email(tv("emailInvalid")),
    phone: z.string().refine((v) => isValidPhoneBR(v), t("phoneInvalid")),
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
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.contactName,
          locale,
          pending_supplier_tenant_id: tenantId,
          pending_supplier_company_name: values.companyNameInput,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/supplier-onboarding`,
      },
    });
    if (error) {
      setServerError(t("formErrorGeneric"));
      return;
    }
    // The confirmation email often gets opened in a way that bounces the
    // visitor back to this same subdomain's /login (e.g. the PKCE code
    // verifier isn't available if the link is opened in a different
    // browser/tab) — stash the email so LoginForm can prefill it and the
    // person only has to type their password.
    try {
      sessionStorage.setItem("bh_signup_email", values.email);
    } catch {
      // storage unavailable (private mode, etc.) — not worth blocking on
    }
    setSent(true);
  }

  const inputClass =
    "h-11 w-full rounded-md border border-(--border-default) bg-(--bg-canvas) px-3.5 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)";
  const labelClass = "text-[13px] font-medium text-(--ink)";
  const errorClass = "text-xs text-(--danger-500)";

  if (sent) {
    return (
      <div className="rounded-2xl border border-(--border-default) bg-(--bg-surface) p-8 text-center">
        <h3 className="text-[18px] font-bold tracking-tight text-(--ink)">
          {t("formSuccessTitle")}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-(--ink-soft)">
          {t("formSuccessBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-(--border-default) bg-(--bg-surface) p-6 sm:p-8">
      <h3 className="text-[19px] font-bold tracking-tight text-(--ink)">
        {t("formTitle", { name: companyName })}
      </h3>
      <p className="mt-1.5 text-[13.5px] text-(--ink-soft)">{t("formSubtitle")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contactName" className={labelClass}>
              {t("contactNameLabel")}
            </label>
            <input id="contactName" type="text" {...register("contactName")} className={inputClass} />
            {errors.contactName && <span className={errorClass}>{errors.contactName.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="companyNameInput" className={labelClass}>
              {t("companyNameLabel")}
            </label>
            <input
              id="companyNameInput"
              type="text"
              {...register("companyNameInput")}
              className={inputClass}
            />
            {errors.companyNameInput && (
              <span className={errorClass}>{errors.companyNameInput.message}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={labelClass}>
              {t("emailLabel")}
            </label>
            <input id="email" type="email" {...register("email")} className={inputClass} />
            {errors.email && <span className={errorClass}>{errors.email.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className={labelClass}>
              {t("phoneLabel")}
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="(11) 91234-5678"
              {...register("phone", {
                onChange: (e) => {
                  e.target.value = formatPhoneBR(e.target.value);
                },
              })}
              className={inputClass}
            />
            {errors.phone && <span className={errorClass}>{errors.phone.message}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            {ts("passwordLabel")}
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            {...register("password")}
            className={inputClass}
          />
          {errors.password ? (
            <span className={errorClass}>{errors.password.message}</span>
          ) : (
            <span className="text-xs text-(--ink-soft)">{ts("passwordHint")}</span>
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
          className="mt-1 inline-flex h-11 items-center justify-center rounded-md bg-(--brand-500) text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting ? t("formSubmitting") : t("formSubmit")}
        </button>
      </form>
    </div>
  );
}
