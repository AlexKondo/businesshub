import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SupplierLeadForm } from "@/components/tenant/supplier-lead-form";

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
    .select("id, name, legal_name, logo_url")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!company) {
    return (
      <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
        <header className="flex items-center justify-end gap-2 px-6 py-5 sm:px-10">
          <ThemeToggle />
          <LanguageToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-20">
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
        </main>
      </div>
    );
  }

  const displayName = company.legal_name || company.name;

  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-(--border-default) bg-(--bg-surface)">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-[13px] font-bold text-(--brand-500)">
                {company.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[14px] font-semibold text-(--ink)">{company.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-(--brand-500) opacity-[0.08] blur-3xl"
          />

          <div className="relative mx-auto flex max-w-[680px] flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-(--border-default) bg-(--bg-surface) shadow-sm">
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

            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-(--accent-soft) px-3 py-1.5 text-xs font-semibold text-(--brand-500)">
              {t("heroEyebrow")}
            </span>

            <h1 className="mt-5 text-balance text-[32px] font-bold leading-[1.15] tracking-tight text-(--ink) sm:text-[42px]">
              {t("heroHeadline", { name: displayName })}
            </h1>
            <p className="mx-auto mt-4 max-w-[520px] text-[15.5px] leading-relaxed text-(--ink-soft)">
              {t("heroSubheadline")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#cadastro"
                className="inline-flex h-11 items-center rounded-md bg-(--brand-500) px-6 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              >
                {t("heroCta")}
              </a>
              <a
                href={`https://${rootDomain}/en-US/login`}
                className="inline-flex h-11 items-center rounded-md px-6 text-sm font-semibold text-(--ink-soft) transition-colors hover:text-(--ink)"
              >
                {t("loginCta")}
              </a>
            </div>
          </div>
        </section>

        <section id="cadastro" className="scroll-mt-10 px-6 pb-24">
          <div className="mx-auto max-w-[640px]">
            <SupplierLeadForm tenantId={company.id} companyName={displayName} />
          </div>
        </section>
      </main>

      <footer className="border-t border-(--border-default) px-6 py-8 text-center text-xs text-(--ink-soft) sm:px-10">
        {t("poweredBy")}{" "}
        <a href={`https://${rootDomain}`} className="font-medium text-(--brand-500) hover:opacity-80">
          BusinessHub
        </a>
      </footer>
    </div>
  );
}
