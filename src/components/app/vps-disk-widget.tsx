"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HardDrive, RefreshCw } from "lucide-react";

type DiskInfo = {
  total: number;
  used: number;
  free: number;
  available: number;
  usedPercent: number;
};

function gb(bytes: number): string {
  return (bytes / 1_000_000_000).toFixed(1);
}

// Auto-refreshes hourly and on demand (button). Reads /api/system/disk, which
// reports the VPS host disk via statfs from inside our container.
const HOUR_MS = 60 * 60 * 1000;

export function VpsDiskWidget() {
  const t = useTranslations("dashboardPage");
  const [disk, setDisk] = useState<DiskInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/system/disk", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      setDisk(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() flips a loading flag then fetches; the meaningful state lands after an await
    load();
    const id = setInterval(load, HOUR_MS);
    return () => clearInterval(id);
  }, [load]);

  const pct = disk?.usedPercent ?? 0;
  const barColor =
    pct >= 90 ? "bg-(--danger-500)" : pct >= 75 ? "bg-(--warning-500)" : "bg-(--brand-500)";

  return (
    <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
          <HardDrive size={14} strokeWidth={1.75} />
          {t("diskTitle")}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title={t("diskRefresh")}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-(--border-default) text-(--ink-soft) transition-colors hover:bg-(--accent-soft) hover:text-(--ink) disabled:opacity-50"
        >
          <RefreshCw size={13} strokeWidth={1.75} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-(--danger-500)">{t("diskError")}</p>
      ) : disk === null ? (
        <p className="mt-3 text-[13px] text-(--ink-soft)">{t("diskLoading")}</p>
      ) : (
        <>
          <p className="mt-2 text-[18px] font-bold tracking-tight text-(--ink)">
            {gb(disk.used)} / {gb(disk.total)} GB
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--border-default)">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-(--ink-soft)">
            {t("diskUsedPercent", { percent: pct })} · {t("diskFree", { gb: gb(disk.available) })}
          </p>
        </>
      )}
    </div>
  );
}
