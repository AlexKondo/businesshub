import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

// Public, unauthenticated page — reachable at the bare root of a tenant
// subdomain (e.g. acme.businesshub.app.br). This is the address shared with
// that company's own customers and suppliers, so it never touches
// tenant-internal data beyond name/logo. See src/proxy.ts for the rewrite
// that routes anonymous visitors here instead of the app dashboard.
export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("tenantLanding");
  const rootDomain = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "");

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("name, legal_name, logo_url")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <header className="flex items-center justify-end gap-2 px-6 py-5 sm:px-10">
        <ThemeToggle />
        <LanguageToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        {company ? (
          <div className="flex w-full max-w-[440px] flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-(--border-default) bg-(--bg-surface)">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[22px] font-bold text-(--brand-500)">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <h1 className="mt-5 text-balance text-[26px] font-bold leading-tight tracking-tight text-(--ink) sm:text-[30px]">
              {company.legal_name || company.name}
            </h1>
            <p className="mt-2 text-[14.5px] text-(--ink-soft)">
              {t("subtitle", { name: company.name })}
            </p>

            <a
              href={`https://${rootDomain}/en-US/login`}
              className="mt-8 inline-flex h-11 items-center rounded-md bg-(--brand-500) px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t("loginCta")}
            </a>

            <p className="mt-10 text-xs text-(--ink-soft)">
              {t("poweredBy")}{" "}
              <a
                href={`https://${rootDomain}`}
                className="font-medium text-(--brand-500) hover:opacity-80"
              >
                BusinessHub
              </a>
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-[420px] flex-col items-center text-center">
            <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">
              {t("notFoundTitle")}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
              {t("notFoundBody")}
            </p>
            <a
              href={`https://${rootDomain}`}
              className="mt-6 inline-flex h-10 items-center rounded-md border border-(--border-default) px-5 text-sm font-semibold text-(--ink) transition-colors hover:bg-(--bg-surface)"
            >
              {t("notFoundCta")}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
