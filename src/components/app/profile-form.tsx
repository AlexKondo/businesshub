"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ProfileForm({
  userId,
  email,
  fullName,
  avatarUrl,
}: {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("profilePage");
  const tv = useTranslations("auth.validation");
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = z.object({
    fullName: z.string().min(1, tv("nameRequired")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { fullName }, resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSaved(false);
    const supabase = createClient();
    await Promise.all([
      supabase.auth.updateUser({ data: { full_name: values.fullName } }),
      supabase.from("profiles").update({ full_name: values.fullName }).eq("id", userId),
    ]);
    setSaved(true);
    router.refresh();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarError(null);
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(t("avatarError"));
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setAvatarError(t("avatarError"));
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const bustedUrl = `${publicUrl}?t=${Date.now()}`;

    await Promise.all([
      supabase.auth.updateUser({ data: { avatar_url: bustedUrl } }),
      supabase.from("profiles").update({ avatar_url: bustedUrl }).eq("id", userId),
    ]);

    setAvatar(bustedUrl);
    setUploading(false);
    router.refresh();
    // The header avatar button is a separate component instance with its
    // own fetched state (not server props), so router.refresh() alone
    // doesn't reach it — nudge it directly.
    window.dispatchEvent(new CustomEvent("profile-avatar-updated", { detail: bustedUrl }));
  }

  return (
    <div className="mt-6 flex max-w-[420px] flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-(--border-default) bg-(--bg-surface) p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-(--border-default) bg-(--bg-canvas)">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-(--ink-soft)">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-canvas) disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" />
              {uploading ? t("avatarUploading") : t("avatarChangePhoto")}
            </button>
            {avatarError && (
              <p className="mt-1.5 text-xs text-(--danger-500)">{avatarError}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-[13px] font-medium text-(--ink)">
              {t("nameLabel")}
            </label>
            <input
              id="fullName"
              type="text"
              {...register("fullName")}
              className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
            />
            {errors.fullName && (
              <span className="text-xs text-(--danger-500)">{errors.fullName.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-(--ink)">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink-soft) opacity-60"
            />
            <span className="text-xs text-(--ink-soft)">{t("emailHint")}</span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? t("saving") : t("save")}
            </button>
            {saved && <span className="text-[13px] text-(--success-500)">{t("saved")}</span>}
          </div>
        </form>
      </div>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const t = useTranslations("profilePage");
  const tv = useTranslations("auth.validation");
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);

  const schema = z
    .object({
      newPassword: z.string().min(8, tv("passwordMin")),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setChanged(false);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    if (!error) {
      setChanged(true);
      reset();
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-(--border-default) bg-(--bg-surface) p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-(--ink)">{t("passwordSectionTitle")}</h2>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setChanged(false);
            }}
            className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--bg-canvas)"
          >
            {t("changePasswordButton")}
          </button>
        )}
      </div>

      {changed && <p className="text-[13px] text-(--success-500)">{t("passwordChanged")}</p>}

      {open && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-[13px] font-medium text-(--ink)">
              {t("newPasswordLabel")}
            </label>
            <input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
            />
            {errors.newPassword && (
              <span className="text-xs text-(--danger-500)">{errors.newPassword.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] font-medium text-(--ink)">
              {t("confirmPasswordLabel")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
            />
            {errors.confirmPassword && (
              <span className="text-xs text-(--danger-500)">{errors.confirmPassword.message}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? t("changingPassword") : t("changePasswordSubmit")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-(--border-default) px-4 text-sm font-medium text-(--ink) transition-colors hover:bg-(--bg-canvas)"
            >
              {t("cancelButton")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
