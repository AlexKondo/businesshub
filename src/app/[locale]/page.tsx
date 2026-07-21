import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";

export default function LandingPage() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-[720px] px-6 pt-20 pb-16 text-center sm:pt-28">
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-(--accent-soft) px-3 py-1.5 text-xs font-semibold text-(--brand-500)">
            {t("hero.eyebrow")}
          </span>
          <h1 className="text-balance text-[34px] font-bold leading-[1.15] tracking-tight text-(--ink) sm:text-[44px]">
            {t("hero.headline")}
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[16.5px] leading-relaxed text-(--ink-soft)">
            {t("hero.subheadline")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center rounded-md bg-(--brand-500) px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t("hero.ctaPrimary")}
            </Link>
            <span className="inline-flex h-11 cursor-default items-center rounded-md border border-(--border-default) px-6 text-sm font-semibold text-(--ink)">
              {t("hero.ctaSecondary")}
            </span>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1020px] grid-cols-2 gap-3 px-6 pb-24 sm:grid-cols-4">
          <div className="col-span-2 row-span-2 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5 sm:col-span-1">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("bento.modulesTitle")}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="h-7 w-7 rounded-md border border-(--brand-500) bg-(--accent-soft)" />
              <span className="h-px w-4 bg-(--border-default)" />
              <span className="h-7 w-7 rounded-md border border-(--brand-500) bg-(--accent-soft)" />
              <span className="h-px w-4 bg-(--border-default)" />
              <span className="h-7 w-7 rounded-md border border-(--brand-500) bg-(--accent-soft)" />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="h-7 w-7 rounded-md border border-(--brand-500) bg-(--accent-soft)" />
              <span className="h-px w-4 bg-(--border-default)" />
              <span className="h-7 w-7 rounded-md border border-(--brand-500) bg-(--accent-soft)" />
            </div>
          </div>

          <div className="col-span-2 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("bento.approvalsTitle")}
            </p>
            <div className="flex h-[52px] items-end gap-1.5">
              {[40, 65, 50, 85, 72, 95].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-full rounded-t-[3px] bg-(--brand-500) opacity-85"
                />
              ))}
            </div>
          </div>

          <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("bento.tenantsTitle")}
            </p>
            <p className="text-[26px] font-bold tabular-nums text-(--ink)">
              {t("bento.tenantsValue")}
            </p>
          </div>

          <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("bento.uptimeTitle")}
            </p>
            <p className="text-[26px] font-bold tabular-nums text-(--ink)">
              {t("bento.uptimeValue")}
            </p>
          </div>

          <div className="col-span-2 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
              {t("bento.auditTitle")}
            </p>
            <p className="text-[13px] leading-relaxed text-(--ink-soft)">
              {t("bento.auditBody")}
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--border-default) px-6 py-8 text-center text-xs text-(--ink-soft) sm:px-10">
        © {new Date().getFullYear()} BusinessHub. {t("footer.rights")}
      </footer>
    </div>
  );
}
