"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { routing } from "@/i18n/routing";
import { writeThemeCookie } from "@/components/theme-cookie-sync";
import { PasswordInput } from "@/components/auth/password-input";

export function LoginForm({ tenantSlug }: { tenantSlug: string | null }) {
  const t = useTranslations("auth.login");
  const tv = useTranslations("auth.validation");
  const locale = useLocale();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email(tv("emailInvalid")),
    password: z.string().min(8, tv("passwordMin")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    // Prefill the email left behind by the supplier signup form, if any —
    // see supplier-signup-form.tsx for why this bounce to /login happens.
    try {
      const pendingEmail = sessionStorage.getItem("bh_signup_email");
      if (pendingEmail) {
        setValue("email", pendingEmail);
        sessionStorage.removeItem("bh_signup_email");
      }
    } catch {
      // storage unavailable — nothing to prefill
    }
  }, [setValue]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      if (error.code === "email_not_confirmed") {
        setServerError(t("errorEmailNotConfirmed"));
      } else if (error.status === 400) {
        setServerError(t("errorInvalid"));
      } else {
        setServerError(t("errorGeneric"));
      }
      return;
    }
    // Enforce a single active session per account: signing in here revokes
    // every other refresh token for this user (other devices/browsers get
    // signed out the next time they make a request), so a shared password
    // can't be used concurrently. Best-effort — a failure here shouldn't
    // block the login that already succeeded.
    await supabase.auth.signOut({ scope: "others" }).catch(() => null);

    const [{ data: memberships, error: membershipsError }, { data: userData, error: userError }] =
      await Promise.all([
        supabase.from("memberships").select("companies(slug)").eq("status", "active"),
        supabase.auth.getUser(),
      ]);
    const slugs = (memberships ?? [])
      .map((m) => (m as unknown as { companies: { slug: string } | null }).companies?.slug)
      .filter((s): s is string => !!s);

    const { data: platformAdmin, error: platformAdminError } = userData.user
      ? await supabase
          .from("platform_admins")
          .select("user_id")
          .eq("user_id", userData.user.id)
          .maybeSingle()
      : { data: null, error: null };

    // Preferences follow the account (saved in user_metadata by the theme/
    // language toggles): apply the saved theme immediately and route to the
    // saved language, so a fresh browser/device reflects the user's choices.
    const meta = userData.user?.user_metadata ?? {};
    const savedTheme = meta.theme as string | undefined;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      setTheme(savedTheme);
      writeThemeCookie(savedTheme);
    }
    const savedLocale = meta.locale as string | undefined;
    const targetLocale =
      savedLocale && (routing.locales as readonly string[]).includes(savedLocale)
        ? savedLocale
        : locale;

    if (tenantSlug) {
      // Logging in FROM a specific tenant's subdomain must only succeed for
      // that tenant — never silently swap the visitor over to some other
      // company they happen to belong to, which is confusing and looks
      // broken from where they started. A platform admin has no membership
      // anywhere, so exempt them — they can operate any tenant.
      if (!platformAdmin && !slugs.includes(tenantSlug)) {
        // Only force a sign-out when we're SURE they don't belong here. If
        // either membership/platform-admin read failed transitively (network,
        // RLS lag), memberships come back empty and this would nuke the session
        // of a legitimate member — show a retryable error and keep them signed
        // in instead.
        if (membershipsError || platformAdminError || userError) {
          setServerError(t("errorGeneric"));
          return;
        }
        await supabase.auth.signOut().catch(() => null);
        setServerError(t("errorNoAccountHere"));
        return;
      }
      router.push("/dashboard", { locale: targetLocale });
      router.refresh();
      return;
    }

    // A platform admin lives on the ROOT domain (platform-wide company
    // management). Never auto-jump them into a tenant subdomain just because
    // they happen to hold a membership somewhere — stay here.
    if (platformAdmin) {
      router.push("/dashboard", { locale: targetLocale });
      router.refresh();
      return;
    }

    if (slugs[0]) {
      // Logging in from the root domain with an account that belongs to a
      // tenant: auto-redirect to that workspace (same convenience pattern as
      // Slack/Notion — no need to remember the exact subdomain), but show a
      // brief transition message first so the jump isn't jarring/silent.
      setRedirecting(slugs[0]);
      const root = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");
      setTimeout(() => {
        window.location.href = `https://${slugs[0]}.${root}/${targetLocale}/dashboard`;
      }, 1200);
      return;
    }

    router.push("/dashboard", { locale: targetLocale });
    router.refresh();
  }

  if (redirecting) {
    return (
      <div className="rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-(--border-default) border-t-(--brand-500)" />
        <p className="mt-4 text-[14px] font-medium text-(--ink)">
          {t("redirectingToWorkspace", { slug: redirecting })}
        </p>
      </div>
    );
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
          <PasswordInput
            id="password"
            autoComplete="current-password"
            {...register("password")}
            className="h-10 w-full rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
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
        {tenantSlug ? (
          // On a tenant subdomain, "/signup" is a root-domain-only staff
          // route — proxy.ts bounces an anonymous visitor straight back to
          // /login, which looked like the link did nothing. The real
          // supplier signup form lives on this subdomain's own landing page.
          <Link href="/" className="font-medium text-(--brand-500)">
            {t("signupLink")}
          </Link>
        ) : (
          <Link href="/signup" className="font-medium text-(--brand-500)">
            {t("signupLink")}
          </Link>
        )}
      </p>
    </div>
  );
}
