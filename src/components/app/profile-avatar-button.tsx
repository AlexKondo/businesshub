"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileAvatarButton({ userId }: { userId: string }) {
  const t = useTranslations("profilePage");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      setAvatarUrl(data?.avatar_url ?? null);
      setInitial((data?.full_name ?? "").trim().charAt(0).toUpperCase());
    }
    load();
  }, [userId]);

  return (
    <Link
      href="/profile"
      title={t("title")}
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-default) bg-(--accent-soft) transition-opacity hover:opacity-80"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[13px] font-semibold text-(--brand-500)">{initial}</span>
      )}
    </Link>
  );
}
