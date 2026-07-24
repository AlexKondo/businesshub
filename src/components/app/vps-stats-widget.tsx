"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cpu, MemoryStick, HardDrive, RefreshCw } from "lucide-react";

type Usage = { total: number; used: number; available: number; percent: number };
type Stats = {
  cpu: { percent: number; cores: number };
  memory: Usage;
  disk: Usage;
  uptimeSeconds: number;
};

function gb(bytes: number): string {
  return (bytes / 1_000_000_000).toFixed(1);
}

function barColor(pct: number): string {
  return pct >= 90 ? "bg-(--danger-500)" : pct >= 75 ? "bg-(--warning-500)" : "bg-(--brand-500)";
}

const HOUR_MS = 60 * 60 * 1000;

function StatCard({
  icon: Icon,
  label,
  value,
  percent,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  percent: number;
  sub: string;
}) {
  return (
    <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
        <Icon size={14} strokeWidth={1.75} />
        {label}
      </div>
      <p className="mt-2 text-[22px] font-bold tracking-tight text-(--ink)">{value}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--border-default)">
        <div
          className={`h-full rounded-full transition-all ${barColor(percent)}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-(--ink-soft)">{sub}</p>
    </div>
  );
}

// Reads /api/system/stats (CPU/memory/disk of the VPS host, via /proc + statfs
// from inside the container). Auto-refreshes hourly and on the refresh button.
export function VpsStatsWidget() {
  const t = useTranslations("dashboardPage");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/system/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      setStats(await res.json());
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

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-(--ink-soft)">
          {t("serverSectionTitle")}
        </h2>
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
      ) : stats === null ? (
        <p className="mt-3 text-[13px] text-(--ink-soft)">{t("diskLoading")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:max-w-[820px]">
          <StatCard
            icon={Cpu}
            label={t("cpuTitle")}
            value={`${stats.cpu.percent}%`}
            percent={stats.cpu.percent}
            sub={t("cpuCoresLabel", { cores: stats.cpu.cores })}
          />
          <StatCard
            icon={MemoryStick}
            label={t("memoryTitle")}
            value={`${gb(stats.memory.used)} / ${gb(stats.memory.total)} GB`}
            percent={stats.memory.percent}
            sub={`${t("diskUsedPercent", { percent: stats.memory.percent })} · ${t("diskFree", { gb: gb(stats.memory.available) })}`}
          />
          <StatCard
            icon={HardDrive}
            label={t("diskShortTitle")}
            value={`${gb(stats.disk.used)} / ${gb(stats.disk.total)} GB`}
            percent={stats.disk.percent}
            sub={`${t("diskUsedPercent", { percent: stats.disk.percent })} · ${t("diskFree", { gb: gb(stats.disk.available) })}`}
          />
        </div>
      )}
    </div>
  );
}
