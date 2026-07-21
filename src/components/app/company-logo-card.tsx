"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1000;

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid_image"));
    };
    img.src = url;
  });
}

export function CompanyLogoCard({
  tenantId,
  currentLogoUrl,
}: {
  tenantId: string;
  currentLogoUrl: string | null;
}) {
  const t = useTranslations("companyLogo");
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (file.size > MAX_LOGO_BYTES) {
      setError(t("errorSize"));
      return;
    }

    try {
      const { width, height } = await readImageDimensions(file);
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        setError(t("errorDimensions"));
        return;
      }
    } catch {
      setError(t("errorGeneric"));
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError(t("errorGeneric"));
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("company-logos").getPublicUrl(path);
    const bustedUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("companies").update({ logo_url: bustedUrl }).eq("id", tenantId);

    setLogoUrl(bustedUrl);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="mt-6 flex max-w-[420px] flex-col gap-4 rounded-xl border border-(--border-default) bg-(--bg-surface) p-6">
      <h2 className="text-[15px] font-semibold text-(--ink)">{t("title")}</h2>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-(--border-default) bg-(--bg-canvas)">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={t("title")} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-(--ink-soft)" />
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-canvas) disabled:opacity-60"
          >
            {uploading ? t("uploading") : t("changeButton")}
          </button>
          <p className="mt-1.5 text-xs text-(--ink-soft)">{t("hint")}</p>
          {error && <p className="mt-1 text-xs text-(--danger-500)">{error}</p>}
        </div>
      </div>
    </div>
  );
}
