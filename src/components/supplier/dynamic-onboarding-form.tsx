"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { MultiSelectWithOther } from "@/components/supplier/multiselect-with-other";
import { applyMask, isCnpjShapedMask } from "@/lib/mask";
import { isValidCnpj } from "@/lib/cnpj";
import { formatCep, isValidCep, lookupCep } from "@/lib/cep";
import type { OnboardingField, OnboardingAnswers } from "@/lib/onboarding-fields";
import { normalizeLabel } from "@/lib/text";

const inputClass =
  "h-10 rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)";
// No h-10 here: a fixed CSS height overrides the browser's rows-based
// intrinsic sizing for <textarea>, which would silently ignore the admin's
// configured field.rows. resize-y (not -none) so the supplier can still
// stretch it further by hand if they need more room while typing.
const textareaClass =
  "resize-y rounded-md border border-(--border-default) bg-(--bg-canvas) px-3 py-2 text-sm text-(--ink) outline-none focus:border-(--brand-500) focus:ring-1 focus:ring-(--brand-500)";
const labelClass = "text-[13px] font-medium text-(--ink)";
const errorClass = "text-xs text-(--danger-500)";

function fieldToZod(field: OnboardingField, requiredMessage: string): z.ZodTypeAny {
  switch (field.field_type) {
    case "number": {
      const base = z.coerce.number();
      return field.required ? base : base.optional();
    }
    case "boolean": {
      // With allow_other, the answer is true/false OR a free-text string
      // (the "Outro" choice). A just-selected-but-empty "Outro" is a string
      // "" that must still fail the required check.
      if (field.allow_other) {
        const base = z.union([z.boolean(), z.string()]).optional();
        return field.required
          ? base.refine(
              (v) => v === true || v === false || (typeof v === "string" && v.trim() !== ""),
              requiredMessage
            )
          : base;
      }
      const base = z.boolean().optional();
      return field.required ? base.refine((v) => v !== undefined, requiredMessage) : base;
    }
    case "multiselect": {
      const base = z.array(z.string());
      return field.required ? base.min(1, requiredMessage) : base.optional();
    }
    case "text":
    case "textarea":
    case "date":
    case "select":
    default: {
      const base = z.string();
      return field.required ? base.min(1, requiredMessage) : base.optional();
    }
  }
}

function defaultValueFor(field: OnboardingField, initialAnswers: OnboardingAnswers) {
  const saved = initialAnswers[field.key];
  if (field.field_type === "multiselect") return Array.isArray(saved) ? saved : [];
  if (field.field_type === "boolean") {
    if (field.allow_other) {
      return typeof saved === "boolean" || typeof saved === "string" ? saved : undefined;
    }
    return typeof saved === "boolean" ? saved : undefined;
  }
  return saved ?? "";
}

function SelectWithOther({
  options,
  allowOther,
  value,
  onChange,
  otherLabel,
  otherPlaceholder,
}: {
  options: { value: string; label: string; category?: string }[];
  allowOther: boolean;
  value: string;
  onChange: (v: string) => void;
  otherLabel: string;
  otherPlaceholder: string;
}) {
  const isKnownValue = options.some((o) => o.value === value);
  const [otherMode, setOtherMode] = useState(allowOther && value !== "" && !isKnownValue);

  const groups = new Map<string, { value: string; label: string }[]>();
  for (const option of options) {
    const key = option.category?.trim() || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={otherMode ? "__other__" : isKnownValue ? value : ""}
        onChange={(e) => {
          if (e.target.value === "__other__") {
            setOtherMode(true);
            onChange("");
          } else {
            setOtherMode(false);
            onChange(e.target.value);
          }
        }}
        className={inputClass}
      >
        <option value="" disabled />
        {Array.from(groups.entries()).map(([category, items]) =>
          category ? (
            <optgroup key={category} label={category}>
              {items.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : (
            items.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          )
        )}
        {allowOther && <option value="__other__">{otherLabel}</option>}
      </select>
      {otherMode && (
        <input
          type="text"
          value={value}
          placeholder={otherPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

// Yes/No radios, plus (when allowOther) a third "Outro" radio that reveals a
// free-text input. The stored value is `true`/`false` for the first two and
// the typed string for "Outro" — an empty string means "Outro" is selected
// but nothing typed yet (still fails a required check, see fieldToZod).
function BooleanWithOther({
  value,
  onChange,
  fieldKey,
  yesLabel,
  noLabel,
  allowOther,
  otherLabel,
  otherPlaceholder,
}: {
  value: boolean | string | undefined;
  onChange: (v: boolean | string) => void;
  fieldKey: string;
  yesLabel: string;
  noLabel: string;
  allowOther: boolean;
  otherLabel: string;
  otherPlaceholder: string;
}) {
  const otherMode = typeof value === "string";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-(--ink)">
          <input
            type="radio"
            name={fieldKey}
            checked={value === true}
            onChange={() => onChange(true)}
            className="h-4 w-4 accent-(--brand-500)"
          />
          {yesLabel}
        </label>
        <label className="flex items-center gap-2 text-[13px] text-(--ink)">
          <input
            type="radio"
            name={fieldKey}
            checked={value === false}
            onChange={() => onChange(false)}
            className="h-4 w-4 accent-(--brand-500)"
          />
          {noLabel}
        </label>
        {allowOther && (
          <label className="flex items-center gap-2 text-[13px] text-(--ink)">
            <input
              type="radio"
              name={fieldKey}
              checked={otherMode}
              onChange={() => onChange("")}
              className="h-4 w-4 accent-(--brand-500)"
            />
            {otherLabel}
          </label>
        )}
      </div>
      {otherMode && (
        <input
          type="text"
          value={value as string}
          placeholder={otherPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function DynamicOnboardingForm({
  tenantId,
  membershipId,
  formId,
  formName,
  headerText,
  footerText,
  companyName,
  fields,
  initialAnswers,
}: {
  tenantId: string;
  membershipId: string;
  formId: string;
  formName: string;
  headerText: string | null;
  footerText: string | null;
  companyName: string;
  fields: OnboardingField[];
  initialAnswers: OnboardingAnswers;
}) {
  const t = useTranslations("supplierOnboarding");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // After a successful save, show the confirmation for a beat, then land
  // back on this same form (re-fetched with the just-saved answers).
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => router.push(`/supplier-onboarding/${formId}`), 3000);
    return () => clearTimeout(timer);
  }, [saved, router, formId]);

  const orderedFields = useMemo(
    () => [...fields].sort((a, b) => a.position - b.position),
    [fields]
  );

  const schema = useMemo(
    () =>
      z.object(
        Object.fromEntries(orderedFields.map((f) => [f.key, fieldToZod(f, t("requiredError"))]))
      ),
    [orderedFields, t]
  );

  const defaultValues = useMemo(
    () =>
      Object.fromEntries(orderedFields.map((f) => [f.key, defaultValueFor(f, initialAnswers)])),
    [orderedFields, initialAnswers]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  // Mirrors the CEP autofill on the root company-creation form: a field
  // literally labeled "CEP" (slugifies to key "cep") looks up the address
  // via ViaCEP on blur and fills in any sibling field whose label matches
  // endereço/rua/logradouro, cidade, or estado/UF — matched by label text
  // since these are admin-defined fields, not fixed ones.
  async function handleCepLookup(rawValue: string) {
    if (!isValidCep(rawValue)) return;
    const found = await lookupCep(rawValue);
    if (!found) return;
    for (const f of orderedFields) {
      if (f.field_type !== "text" || f.key === "cep") continue;
      const norm = normalizeLabel(f.label);
      if (found.street && (norm.includes("endereco") || norm.includes("rua") || norm.includes("logradouro"))) {
        setValue(f.key, found.street, { shouldValidate: true });
      } else if (found.city && norm.includes("cidade")) {
        setValue(f.key, found.city, { shouldValidate: true });
      } else if (found.state && (norm.includes("estado") || norm === "uf")) {
        setValue(f.key, found.state, { shouldValidate: true });
      }
    }
  }

  async function onSubmit(values: Record<string, unknown>) {
    setServerError(null);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase.from("supplier_onboarding_submissions").upsert(
      { tenant_id: tenantId, membership_id: membershipId, form_id: formId, answers: values },
      { onConflict: "membership_id,form_id" }
    );
    if (error) {
      setServerError(t("saveError"));
      return;
    }
    setSaved(true);
    fetch("/api/tenants/notify-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, formId }),
    }).catch(() => null); // best-effort — a notification failure shouldn't affect the supplier's experience
  }

  if (orderedFields.length === 0) {
    return (
      <div className="mx-auto max-w-[1140px] rounded-2xl border border-(--border-default) bg-(--bg-surface) p-8 text-center">
        <h1 className="text-[19px] font-bold tracking-tight text-(--ink)">{t("emptyTitle")}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-(--ink-soft)">
          {t("emptyBody", { name: companyName })}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1140px] rounded-2xl border border-(--border-default) bg-(--bg-surface) p-6 shadow-sm sm:p-8">
      <h1 className="text-[22px] font-bold tracking-tight text-(--ink)">{formName}</h1>
      <p className="mt-1 text-[14px] text-(--ink-soft)">{t("subtitle", { name: companyName })}</p>

      {headerText?.trim() && (
        <div className="mt-5 whitespace-pre-wrap rounded-md border border-(--border-default) bg-(--bg-canvas) px-4 py-3 text-[14px] leading-relaxed text-(--ink)">
          {headerText}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 grid grid-cols-[repeat(50,minmax(0,1fr))] gap-y-5"
      >
        {orderedFields.map((field) => {
          const error = errors[field.key];
          const isMaskedCnpj =
            field.field_type === "text" && !!field.mask && isCnpjShapedMask(field.mask);
          const currentValue = isMaskedCnpj ? (watch(field.key) as string | undefined) : undefined;
          const cnpjLooksIncomplete =
            !currentValue || currentValue.replace(/[^0-9A-Z]/gi, "").length < 14;
          const showCnpjWarning =
            isMaskedCnpj && !error && !cnpjLooksIncomplete && !isValidCnpj(currentValue ?? "");

          return (
            <div
              key={field.id}
              style={{ "--field-span": field.width } as React.CSSProperties}
              className="flex flex-col gap-1.5 px-2.5 first:pl-0 last:pr-0 [grid-column:span_50] sm:[grid-column:span_var(--field-span)]"
            >
              <label htmlFor={field.key} className={labelClass}>
                {field.label}
                {field.required && <span className="text-(--danger-500)"> *</span>}
              </label>

              {(field.field_type === "text" ||
                field.field_type === "number" ||
                field.field_type === "date") && (
                <input
                  id={field.key}
                  type={
                    field.field_type === "number"
                      ? "number"
                      : field.field_type === "date" && !field.mask
                        ? "date"
                        : "text"
                  }
                  placeholder={
                    field.field_type === "date" && field.mask ? field.mask : undefined
                  }
                  {...register(field.key, {
                    onChange: (e) => {
                      if (field.field_type === "text" && field.key === "cep") {
                        e.target.value = formatCep(e.target.value);
                      } else if (
                        (field.field_type === "text" || field.field_type === "date") &&
                        field.mask
                      ) {
                        e.target.value = applyMask(e.target.value, field.mask);
                      }
                    },
                    onBlur: (e) => {
                      if (field.field_type === "text" && field.key === "cep") {
                        handleCepLookup(e.target.value);
                      }
                    },
                  })}
                  className={inputClass}
                />
              )}

              {field.field_type === "textarea" && (
                <textarea
                  id={field.key}
                  rows={field.rows}
                  {...register(field.key)}
                  className={textareaClass}
                />
              )}

              {field.field_type === "boolean" && (
                <Controller
                  control={control}
                  name={field.key}
                  render={({ field: controllerField }) => (
                    <BooleanWithOther
                      value={controllerField.value as boolean | string | undefined}
                      onChange={controllerField.onChange}
                      fieldKey={field.key}
                      yesLabel={t("booleanYes")}
                      noLabel={t("booleanNo")}
                      allowOther={field.allow_other}
                      otherLabel={t("otherOptionLabel")}
                      otherPlaceholder={t("otherOptionPlaceholder")}
                    />
                  )}
                />
              )}

              {field.field_type === "select" && (
                <Controller
                  control={control}
                  name={field.key}
                  render={({ field: controllerField }) => (
                    <SelectWithOther
                      options={field.options}
                      allowOther={field.allow_other}
                      value={(controllerField.value as string) ?? ""}
                      onChange={controllerField.onChange}
                      otherLabel={t("otherOptionLabel")}
                      otherPlaceholder={t("otherOptionPlaceholder")}
                    />
                  )}
                />
              )}

              {field.field_type === "multiselect" && (
                <Controller
                  control={control}
                  name={field.key}
                  render={({ field: controllerField }) => (
                    <MultiSelectWithOther
                      options={field.options}
                      allowOther={field.allow_other}
                      value={(controllerField.value as string[]) ?? []}
                      onChange={controllerField.onChange}
                      addLabel={t("addCustomOption")}
                      placeholder={t("customOptionPlaceholder")}
                    />
                  )}
                />
              )}

              {error && <span className={errorClass}>{String(error.message)}</span>}
              {showCnpjWarning && (
                <span className="text-xs text-(--warning-500)">{t("cnpjChecksumWarning")}</span>
              )}
            </div>
          );
        })}

        {serverError && (
          <p className="col-span-full rounded-md bg-(--danger-500)/10 px-3 py-2 text-xs text-(--danger-500)">
            {serverError}
          </p>
        )}
        {saved && !serverError && (
          <p className="col-span-full rounded-md bg-(--success-500)/10 px-3 py-2 text-xs text-(--success-500)">
            {t("saveSuccess")}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-full mt-1 inline-flex h-11 items-center justify-center rounded-md bg-(--brand-500) text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>

      {footerText?.trim() && (
        <div className="mt-6 whitespace-pre-wrap border-t border-(--border-default) pt-4 text-[13.5px] leading-relaxed text-(--ink-soft)">
          {footerText}
        </div>
      )}
    </div>
  );
}
