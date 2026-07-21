import { useTranslations } from "next-intl";
import { SiteHeader } from "@/components/site-header";

export default function PrivacyPage() {
  const t = useTranslations("legal.privacy");

  return (
    <div className="flex min-h-screen flex-col bg-(--bg-canvas)">
      <SiteHeader />
      <main className="flex-1 px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[680px]">
          <h1 className="text-[26px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
          <p className="mt-4 text-[14px] leading-relaxed text-(--ink-soft)">{t("placeholder")}</p>
        </div>
      </main>
    </div>
  );
}
