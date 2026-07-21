"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics after NFD split
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function waitForDeployment(deploymentUuid: string, timeoutMs = 5 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`/api/tenants/deployment-status?uuid=${deploymentUuid}`);
    const { status } = await res.json();
    if (status === "finished" || status === "failed") return status;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return "timeout";
}

export function OnboardingForm({ appRootDomain }: { appRootDomain: string }) {
  const t = useTranslations("onboarding");
  const [serverError, setServerError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const schema = z.object({
    name: z.string().min(2, t("nameTooShort")),
    slug: z
      .string()
      .min(2, t("slugTooShort"))
      .regex(/^[a-z0-9-]+$/, t("slugInvalid")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", slug: "" } });

  const slugEditedManually = useRef(false);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: values.name, slug: values.slug })
      .select("id")
      .single();

    if (companyError) {
      setServerError(
        companyError.code === "23505" ? t("slugTaken") : t("errorGeneric")
      );
      return;
    }

    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Administrador da Empresa")
      .is("tenant_id", null)
      .single();

    const { error: membershipError } = await supabase.from("memberships").insert({
      user_id: user.id,
      tenant_id: company.id,
      role_id: role!.id,
    });

    if (membershipError) {
      setServerError(t("errorGeneric"));
      return;
    }

    setProvisioning(true);

    const registerRes = await fetch("/api/tenants/register-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: values.slug }),
    });
    const { deploymentUuid } = await registerRes.json();

    if (deploymentUuid) {
      await waitForDeployment(deploymentUuid);
    }

    window.location.href = `https://${values.slug}.${appRootDomain}/en-US/dashboard`;
  }

  if (provisioning) {
    return (
      <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
        <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">
          {t("provisioningTitle")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {t("provisioningBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7">
      <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
      <p className="mt-1.5 text-[13.5px] text-(--ink-soft)">{t("subtitle")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-[13px] font-medium text-(--ink)">
            {t("nameLabel")}
          </label>
          <input
            id="name"
            type="text"
            {...register("name", {
              onChange: (e) => {
                if (!slugEditedManually.current) {
                  setValue("slug", slugify(e.target.value));
                }
              },
            })}
            className="h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)"
          />
          {errors.name && (
            <span className="text-xs text-(--danger-500)">{errors.name.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-[13px] font-medium text-(--ink)">
            {t("slugLabel")}
          </label>
          <div className="flex items-center overflow-hidden rounded-md border border-(--border-default) bg-(--bg-canvas) focus-within:border-(--brand-500) focus-within:ring-1 focus-within:ring-(--brand-500)">
            <input
              id="slug"
              type="text"
              {...register("slug", { onChange: () => (slugEditedManually.current = true) })}
              className="h-10 flex-1 bg-transparent px-3 text-sm text-(--ink) outline-none"
            />
            <span className="whitespace-nowrap px-3 text-[12.5px] text-(--ink-soft)">
              .{appRootDomain}
            </span>
          </div>
          {errors.slug && (
            <span className="text-xs text-(--danger-500)">{errors.slug.message}</span>
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
    </div>
  );
}
