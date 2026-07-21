"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { isValidCnpj, formatCnpj } from "@/lib/cnpj";
import { isValidPhoneBR, formatPhoneBR } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";

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
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [stage, setStage] = useState<
    "form" | "confirm" | "provisioning" | "provisioning-error" | "success" | "pending"
  >("form");
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [companyExists, setCompanyExists] = useState<boolean | null>(null);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [provisioningSeconds, setProvisioningSeconds] = useState(0);

  useEffect(() => {
    if (stage !== "provisioning") return;
    setProvisioningSeconds(0);
    const interval = setInterval(() => setProvisioningSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) {
          setAccount({
            name: (user.user_metadata?.full_name as string | undefined) ?? "",
            email: user.email ?? "",
          });
        }
      });
  }, []);

  const schema = z.object({
    legalName: z.string().min(2, t("legalNameTooShort")),
    name: z.string().min(2, t("nameTooShort")),
    taxId: z.string().refine((v) => isValidCnpj(v), t("taxIdInvalid")),
    addressStreet: z.string().min(2, t("addressRequired")),
    addressNumber: z.string().min(1, t("addressRequired")),
    addressComplement: z.string().optional(),
    addressCity: z.string().min(2, t("addressRequired")),
    addressState: z.string().min(2, t("addressRequired")),
    addressCountry: z.string().min(2, t("addressRequired")),
    slug: z
      .string()
      .min(2, t("slugTooShort"))
      .regex(/^[a-z0-9-]+$/, t("slugInvalid")),
    phone: z.string().refine((v) => isValidPhoneBR(v), t("phoneTooShort")),
    consent: z.boolean().refine((v) => v === true, t("consentRequired")),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      legalName: "",
      name: "",
      taxId: "",
      addressStreet: "",
      addressNumber: "",
      addressComplement: "",
      addressCity: "",
      addressState: "",
      addressCountry: "BRASIL",
      slug: "",
      phone: "",
      consent: false,
    },
  });

  const slugEditedManually = useRef(false);

  async function submitOrganization(values: FormValues) {
    setServerError(null);

    const res = await fetch("/api/tenants/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (!res.ok) {
      const key: Record<string, string> = {
        invalid_tax_id: "taxIdInvalid",
        slug_or_tax_id_taken: "slugTaken",
      };
      setServerError(t(key[data.error] ?? "errorGeneric"));
      setStage("form");
      return;
    }

    if (data.status === "pending") {
      setStage("pending");
      return;
    }

    setStage("provisioning");
    if (data.deploymentUuid) {
      const status = await waitForDeployment(data.deploymentUuid);
      if (status !== "finished") {
        setCreatedSlug(values.slug);
        setStage("provisioning-error");
        return;
      }
    }
    setCreatedSlug(values.slug);
    setStage("success");
  }

  async function handleSuccessOk() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  async function onValidated(values: FormValues) {
    if (companyExists === false) {
      setPendingValues(values);
      setStage("confirm");
      return;
    }
    await submitOrganization(values);
  }

  if (stage === "pending") {
    return (
      <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
        <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">
          {t("pendingTitle")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {t("pendingBody")}
        </p>
      </div>
    );
  }

  if (stage === "confirm" && pendingValues) {
    return (
      <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7">
        <h1 className="text-[18px] font-bold tracking-tight text-(--ink)">
          {t("adminNoticeTitle")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {t("adminNoticeBody")}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setStage("form")}
            className="flex-1 inline-flex h-10 items-center justify-center rounded-md border border-(--border-default) text-sm font-semibold text-(--ink) transition-colors hover:bg-(--bg-canvas)"
          >
            {t("confirmCancel")}
          </button>
          <button
            type="button"
            onClick={() => void submitOrganization(pendingValues)}
            className="flex-1 inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("confirmProceed")}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "provisioning") {
    const mm = String(Math.floor(provisioningSeconds / 60)).padStart(2, "0");
    const ss = String(provisioningSeconds % 60).padStart(2, "0");
    return (
      <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
        <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">
          {t("provisioningTitle")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {t("provisioningBody")}
        </p>
        <p className="mt-5 font-mono text-[26px] font-bold tabular-nums text-(--brand-500)">
          {mm}:{ss}
        </p>
      </div>
    );
  }

  if (stage === "provisioning-error" && createdSlug) {
    return (
      <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
        <h1 className="text-[18px] font-bold tracking-tight text-(--ink)">
          {t("provisioningErrorTitle")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {t("provisioningErrorBody")}
        </p>
        <button
          type="button"
          onClick={() => void handleSuccessOk()}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("provisioningErrorRetry")}
        </button>
      </div>
    );
  }

  if (stage === "success" && createdSlug) {
    return (
      <div className="w-full max-w-[420px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-7 text-center">
        <h1 className="text-[18px] font-bold tracking-tight text-(--ink)">
          {t("successTitle")}
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {t("successBody", { domain: `${createdSlug}.${appRootDomain}` })}
        </p>
        <button
          type="button"
          onClick={() => void handleSuccessOk()}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("successOk")}
        </button>
      </div>
    );
  }

  const inputClass =
    "h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)";
  const labelClass = "text-[13px] font-medium text-(--ink)";
  const errorClass = "text-xs text-(--danger-500)";

  return (
    <div className="w-full max-w-[640px] rounded-xl border border-(--border-default) bg-(--bg-surface) p-6 sm:p-8">
      <h1 className="text-[20px] font-bold tracking-tight text-(--ink)">{t("title")}</h1>
      <p className="mt-1.5 text-[13.5px] text-(--ink-soft)">{t("subtitle")}</p>

      <form onSubmit={handleSubmit(onValidated)} className="mt-6 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            {t("sectionCompany")}
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="legalName" className={labelClass}>
                {t("legalNameLabel")}
              </label>
              <input
                id="legalName"
                type="text"
                {...register("legalName", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.legalName && <span className={errorClass}>{errors.legalName.message}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={labelClass}>
                {t("nameLabel")}
              </label>
              <input
                id="name"
                type="text"
                {...register("name", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                    if (!slugEditedManually.current) {
                      setValue("slug", slugify(e.target.value));
                    }
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.name && <span className={errorClass}>{errors.name.message}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="taxId" className={labelClass}>
              {t("taxIdLabel")}
            </label>
            <input
              id="taxId"
              type="text"
              placeholder="00.000.000/0000-00"
              {...register("taxId", {
                onChange: (e) => {
                  e.target.value = formatCnpj(e.target.value);
                  setCompanyExists(null);
                },
                onBlur: async (e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  if (!isValidCnpj(digits)) {
                    setCompanyExists(null);
                    return;
                  }
                  try {
                    const res = await fetch(`/api/tenants/check-tax-id?taxId=${digits}`);
                    const data = await res.json();
                    setCompanyExists(Boolean(data.exists));
                  } catch {
                    setCompanyExists(null);
                  }
                },
              })}
              className={inputClass}
            />
            <span className="text-xs text-(--ink-soft)">{t("taxIdHint")}</span>
            {errors.taxId && <span className={errorClass}>{errors.taxId.message}</span>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="addressStreet" className={labelClass}>
                {t("addressStreetLabel")}
              </label>
              <input
                id="addressStreet"
                type="text"
                {...register("addressStreet", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.addressStreet && (
                <span className={errorClass}>{errors.addressStreet.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addressNumber" className={labelClass}>
                {t("addressNumberLabel")}
              </label>
              <input
                id="addressNumber"
                type="text"
                {...register("addressNumber", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.addressNumber && (
                <span className={errorClass}>{errors.addressNumber.message}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="addressComplement" className={labelClass}>
              {t("addressComplementLabel")}
            </label>
            <input
              id="addressComplement"
              type="text"
              {...register("addressComplement", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
              className={`${inputClass} uppercase`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addressCity" className={labelClass}>
                {t("addressCityLabel")}
              </label>
              <input
                id="addressCity"
                type="text"
                {...register("addressCity", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.addressCity && <span className={errorClass}>{errors.addressCity.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addressState" className={labelClass}>
                {t("addressStateLabel")}
              </label>
              <input
                id="addressState"
                type="text"
                {...register("addressState", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.addressState && <span className={errorClass}>{errors.addressState.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addressCountry" className={labelClass}>
                {t("addressCountryLabel")}
              </label>
              <input
                id="addressCountry"
                type="text"
                {...register("addressCountry", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`${inputClass} uppercase`}
              />
              {errors.addressCountry && (
                <span className={errorClass}>{errors.addressCountry.message}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="slug" className={labelClass}>
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
            <span className="text-xs text-(--ink-soft)">{t("slugHint")}</span>
            {errors.slug && <span className={errorClass}>{errors.slug.message}</span>}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-(--ink-soft)">
            {t("sectionPersonal")}
          </legend>

          {account && (
            <div className="flex flex-col gap-1.5 rounded-md bg-(--accent-soft) px-3 py-2.5 text-[13px] text-(--ink-soft)">
              <span>
                {t("personalNameLabel")}: <strong className="text-(--ink)">{account.name}</strong>
              </span>
              <span>
                {t("personalEmailLabel")}: <strong className="text-(--ink)">{account.email}</strong>
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className={labelClass}>
              {t("phoneLabel")}
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="(11) 91234-5678"
              {...register("phone", {
                onChange: (e) => {
                  e.target.value = formatPhoneBR(e.target.value);
                },
              })}
              className={inputClass}
            />
            {errors.phone && <span className={errorClass}>{errors.phone.message}</span>}
          </div>
        </fieldset>

        {companyExists === false && (
          <div className="flex flex-col gap-1.5 rounded-md border border-(--brand-500)/30 bg-(--accent-soft) px-4 py-3">
            <p className="text-[13px] font-semibold text-(--ink)">{t("adminNoticeTitle")}</p>
            <p className="text-[12.5px] leading-relaxed text-(--ink-soft)">{t("adminNoticeBody")}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-(--ink-soft)">
            <input
              type="checkbox"
              {...register("consent")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-(--brand-500)"
            />
            <span>
              {t.rich("consentLabel", {
                terms: (chunks) => (
                  <Link href="/terms" target="_blank" className="font-medium text-(--brand-500)">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" target="_blank" className="font-medium text-(--brand-500)">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
          {errors.consent && <span className={errorClass}>{errors.consent.message}</span>}
        </div>

        {serverError && (
          <p className="rounded-md bg-(--danger-500)/10 px-3 py-2 text-xs text-(--danger-500)">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-md bg-(--brand-500) text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
