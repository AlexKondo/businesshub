"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

type PendingCompany = {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  slug: string;
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
};

const APPROVING_STEP_KEYS = [
  "pendingCompaniesApprovingStep1",
  "pendingCompaniesApprovingStep2",
  "pendingCompaniesApprovingStep3",
] as const;
const APPROVING_STEP_THRESHOLDS = [1, 4]; // seconds at which steps 0-1 tick; last step spins until the request resolves

export function PendingCompaniesPanel() {
  const t = useTranslations("adminPage");
  const [companies, setCompanies] = useState<PendingCompany[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [approving, setApproving] = useState<PendingCompany | null>(null);
  const [approvingDone, setApprovingDone] = useState(false);
  const [approvingError, setApprovingError] = useState(false);
  const [approvingSeconds, setApprovingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Synchronous guard against a genuine double-click firing two requests
  // before React re-renders the disabled button — state alone isn't fast
  // enough to prevent that window.
  const reviewingIdsRef = useRef<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/tenants/pending-companies");
    if (!res.ok) {
      setLoadError(true);
      return;
    }
    const data = await res.json();
    setCompanies(data.companies ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setCompanies runs after an await, not synchronously
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Coolify's deploy endpoint only QUEUES the redeploy — the subdomain
  // isn't actually reachable until Traefik picks up the new domain, which
  // takes 1-3min. Poll deploymentUuid's real status instead of closing the
  // popup as soon as review-company-request itself resolves.
  async function waitForDeployment(deploymentUuid: string) {
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const res = await fetch(
        `/api/tenants/deployment-status?deploymentUuid=${deploymentUuid}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === "finished" || data.status === "failed") return;
    }
  }

  async function review(company: PendingCompany, action: "approve" | "reject") {
    if (reviewingIdsRef.current.has(company.id)) return;
    reviewingIdsRef.current.add(company.id);
    setBusy(company.id);

    if (action === "approve") {
      setApproving(company);
      setApprovingDone(false);
      setApprovingError(false);
      setApprovingSeconds(0);
      timerRef.current = setInterval(() => {
        setApprovingSeconds((s) => s + 1);
      }, 1000);
    }

    const res = await fetch("/api/tenants/review-company-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: company.id, action }),
    });
    setBusy(null);

    if (action === "approve") {
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.deploymentUuid) {
          await waitForDeployment(data.deploymentUuid);
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setApprovingDone(true);
        setTimeout(() => setApproving(null), 1200);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setApprovingError(true);
      }
    }

    reviewingIdsRef.current.delete(company.id);
    load();
  }

  if (loadError) {
    return <p className="text-[13.5px] text-(--danger-500)">{t("pendingCompaniesLoadError")}</p>;
  }

  if (companies === null) {
    return <p className="text-[13.5px] text-(--ink-soft)">{t("loading")}</p>;
  }

  const approvingModal = approving && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-6 text-center">
        <p className="text-[15px] font-semibold text-(--ink)">
          {t("pendingCompaniesApprovingTitle", { name: approving.name })}
        </p>
        {approvingError ? (
          <>
            <p className="mt-3 text-[13px] text-(--danger-500)">
              {t("pendingCompaniesApprovingError")}
            </p>
            <button
              type="button"
              onClick={() => setApproving(null)}
              className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-(--border-default) text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
            >
              {t("onboardingFieldCancel")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-[12.5px] text-(--ink-soft)">
              {t("pendingCompaniesApprovingEstimate")}
            </p>
            <ul className="mt-5 flex flex-col gap-2.5 text-left">
              {APPROVING_STEP_KEYS.map((key, i) => {
                const isLast = i === APPROVING_STEP_KEYS.length - 1;
                const done = approvingDone || (!isLast && approvingSeconds >= APPROVING_STEP_THRESHOLDS[i]);
                const active =
                  !done &&
                  ((isLast && approvingSeconds >= (APPROVING_STEP_THRESHOLDS[i - 1] ?? 0)) ||
                    (!isLast && approvingSeconds >= (APPROVING_STEP_THRESHOLDS[i - 1] ?? 0)));
                return (
                  <li
                    key={key}
                    style={{ animationDelay: `${i * 120}ms` }}
                    className="flex animate-provisioning-step-in items-center gap-2.5 opacity-0 [animation-fill-mode:forwards]"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        done
                          ? "border-(--brand-500) bg-(--brand-500)"
                          : "border-(--border-default) bg-(--bg-canvas)"
                      }`}
                    >
                      {done ? (
                        <Check
                          className="h-3 w-3 animate-provisioning-check-pop text-white"
                          strokeWidth={3}
                        />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin text-(--brand-500)" />
                      ) : null}
                    </span>
                    <span
                      className={`text-[13px] transition-colors duration-300 ${
                        done || active ? "text-(--ink)" : "text-(--ink-soft)"
                      }`}
                    >
                      {t(key)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {approvingDone && (
              <p className="mt-5 text-[13px] font-medium text-(--success-500)">
                {t("pendingCompaniesApprovingDone", { name: approving.name })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (companies.length === 0) {
    return (
      <>
        <p className="text-[13.5px] text-(--ink-soft)">{t("pendingCompaniesEmpty")}</p>
        {approvingModal}
      </>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {companies.map((c) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[14px] font-semibold text-(--ink)">
              {c.name} <span className="font-normal text-(--ink-soft)">· {c.slug}</span>
            </p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {c.legalName} · {c.taxId}
            </p>
            <p className="text-[12.5px] text-(--ink-soft)">
              {t("pendingCompaniesRequestedBy", { name: c.requesterName, email: c.requesterEmail })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busy === c.id}
              onClick={() => review(c, "approve")}
              className="inline-flex h-9 items-center rounded-md bg-(--brand-500) px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("approve")}
            </button>
            <button
              type="button"
              disabled={busy === c.id}
              onClick={() => review(c, "reject")}
              className="inline-flex h-9 items-center rounded-md border border-(--border-default) px-3 text-[13px] font-medium text-(--ink) transition-colors hover:bg-(--accent-soft)"
            >
              {t("reject")}
            </button>
          </div>
        </div>
      ))}
      {approvingModal}
    </div>
  );
}
