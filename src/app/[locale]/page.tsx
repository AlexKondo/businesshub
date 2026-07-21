import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";

export default function LandingPage() {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-[720px] px-6 pt-20 pb-24 text-center sm:pt-28">
          <h1 className="text-balance text-[34px] font-bold leading-[1.15] tracking-tight text-(--ink) sm:text-[44px]">
            {t("hero.headline")}
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[16.5px] leading-relaxed text-(--ink-soft)">
            {t("hero.subheadline")}
          </p>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-(--border-default) px-6 py-8 text-center text-xs text-(--ink-soft) sm:px-10">
        <p>
          © {new Date().getFullYear()} BusinessHub. {t("footer.rights")}
        </p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-(--ink)">
            {t("footer.terms")}
          </Link>
          <Link href="/privacy" className="hover:text-(--ink)">
            {t("footer.privacy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
