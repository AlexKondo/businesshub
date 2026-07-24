"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Cpu, MemoryStick, HardDrive, ArrowDownToLine, ArrowUpFromLine, Gauge, RefreshCw } from "lucide-react";

type Usage = { total: number; used: number; available: number; percent: number };
type Traffic = { latestBytes: number; history: number[] };
type Stats = {
  source: "hostinger" | "proc";
  cpu: { percent: number; cores: number; history: number[] };
  memory: Usage & { history: number[] };
  disk: Usage;
  incoming: Traffic | null;
  outgoing: Traffic | null;
  bandwidth: Usage | null;
  uptimeSeconds: number;
};

function gb(bytes: number): string {
  return (bytes / 1_000_000_000).toFixed(1);
}
function tb(bytes: number): string {
  return (bytes / 1_000_000_000_000).toFixed(3);
}
function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

const POLL_MS = 60_000;

// Filled-area sparkline with a vertical gradient. Auto-scales to the series'
// OWN min–max (not 0–100) so small fluctuations fill the height — the lively
// "heartbeat" waveform Hostinger's panel shows even when CPU is only a few
// percent. A tiny top/bottom padding keeps the peaks/troughs off the edges.
function Sparkline({ points, width = 160, height = 46 }: { points: number[]; width?: number; height?: number }) {
  const gradientId = useId();
  if (points.length < 2) return <div style={{ width, height }} />;
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const range = hi - lo || 1;
  const pad = 4;
  const y = (v: number) => height - pad - ((v - lo) / range) * (height - pad * 2);
  const step = width / (points.length - 1);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="var(--brand-500)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Ring({ percent, size = 56 }: { percent: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const color = p >= 90 ? "var(--danger-500)" : p >= 75 ? "var(--warning-500)" : "var(--brand-500)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 400ms ease" }}
      />
    </svg>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  sub,
  chart,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  chart: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-(--border-default) bg-(--bg-surface) p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-(--ink-soft)">
        <Icon size={14} strokeWidth={1.75} />
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[22px] font-bold tracking-tight text-(--ink)">{value}</p>
          <p className="mt-0.5 truncate text-[12px] text-(--ink-soft)">{sub}</p>
        </div>
        <div className="shrink-0">{chart}</div>
      </div>
    </div>
  );
}

// Mirrors the Hostinger hPanel overview inside our own super-admin dashboard.
// History/traffic come from the Hostinger API (see /api/system/stats); when
// that isn't available it falls back to a local reading (no traffic cards).
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
    let id: ReturnType<typeof setInterval> | null = setInterval(load, POLL_MS);
    function onVisibility() {
      if (document.hidden) {
        if (id) clearInterval(id);
        id = null;
      } else if (!id) {
        load();
        id = setInterval(load, POLL_MS);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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

      {error && stats === null ? (
        <p className="mt-3 text-[13px] text-(--danger-500)">{t("diskError")}</p>
      ) : stats === null ? (
        <p className="mt-3 text-[13px] text-(--ink-soft)">{t("diskLoading")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:max-w-[900px]">
          <Card
            icon={Cpu}
            label={t("cpuTitle")}
            value={`${stats.cpu.percent}%`}
            sub={t("cpuCoresLabel", { cores: stats.cpu.cores })}
            chart={<Sparkline points={stats.cpu.history} />}
          />
          <Card
            icon={MemoryStick}
            label={t("memoryTitle")}
            value={`${stats.memory.percent}%`}
            sub={`${gb(stats.memory.used)} / ${gb(stats.memory.total)} GB`}
            chart={<Sparkline points={stats.memory.history} />}
          />
          <Card
            icon={HardDrive}
            label={t("diskShortTitle")}
            value={`${gb(stats.disk.used)} / ${gb(stats.disk.total)} GB`}
            sub={t("diskUsedPercent", { percent: stats.disk.percent })}
            chart={<Ring percent={stats.disk.percent} />}
          />
          {stats.incoming && (
            <Card
              icon={ArrowDownToLine}
              label={t("incomingTitle")}
              value={formatBytes(stats.incoming.latestBytes)}
              sub={t("trafficWindowHint")}
              chart={<Sparkline points={stats.incoming.history} />}
            />
          )}
          {stats.outgoing && (
            <Card
              icon={ArrowUpFromLine}
              label={t("outgoingTitle")}
              value={formatBytes(stats.outgoing.latestBytes)}
              sub={t("trafficWindowHint")}
              chart={<Sparkline points={stats.outgoing.history} />}
            />
          )}
          {stats.bandwidth && (
            <Card
              icon={Gauge}
              label={t("bandwidthTitle")}
              value={`${tb(stats.bandwidth.used)} / ${tb(stats.bandwidth.total)} TB`}
              sub={t("bandwidthHint")}
              chart={<Ring percent={stats.bandwidth.percent} />}
            />
          )}
        </div>
      )}
    </div>
  );
}
