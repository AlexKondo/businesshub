// Hostinger VPS metrics, used to mirror the hPanel overview inside our own
// super-admin dashboard. Auth is a personal API token generated in hPanel
// (Conta → API), kept in HOSTINGER_API_TOKEN — never committed. The VPS id can
// be pinned via HOSTINGER_VPS_ID; otherwise the first VM on the account is used.
//
// Results are cached in-module for a short TTL so several open admin tabs (and
// the widget's own polling) don't hammer Hostinger's rate limits — its own data
// granularity is ~30 min, so sub-minute freshness would be pointless anyway.

const API_BASE = "https://developers.hostinger.com";
const CACHE_TTL_MS = 30_000;

type Usage = { total: number; used: number; available: number; percent: number };

export type VpsStats = {
  source: "hostinger";
  cpu: { percent: number; cores: number; history: number[] };
  memory: Usage & { history: number[] };
  disk: Usage;
  incoming: { latestBytes: number; history: number[] };
  outgoing: { latestBytes: number; history: number[] };
  bandwidth: Usage; // month-to-date total traffic vs the plan's monthly quota
  uptimeSeconds: number;
};

type Metric = { unit: string; usage: Record<string, number> };
type MetricsResponse = {
  cpu_usage: Metric;
  ram_usage: Metric;
  disk_space: Metric;
  incoming_traffic: Metric;
  outgoing_traffic: Metric;
  uptime: Metric;
};

let cache: { at: number; data: VpsStats } | null = null;
let cachedVpsId: number | null = null;

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

// usage is keyed by unix-second strings — return values ordered chronologically.
function toSeries(metric: Metric | undefined): { ts: number[]; values: number[] } {
  const usage = metric?.usage ?? {};
  const ts = Object.keys(usage)
    .map(Number)
    .sort((a, b) => a - b);
  return { ts, values: ts.map((k) => usage[String(k)]) };
}

function last(values: number[]): number {
  return values.length ? values[values.length - 1] : 0;
}

function pct(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
}

async function resolveVpsId(token: string): Promise<number | null> {
  if (cachedVpsId !== null) return cachedVpsId;
  const envId = process.env.HOSTINGER_VPS_ID;
  if (envId && /^\d+$/.test(envId)) {
    cachedVpsId = Number(envId);
    return cachedVpsId;
  }
  const res = await fetch(`${API_BASE}/api/vps/v1/virtual-machines`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return null;
  const list = (await res.json()) as Array<{ id: number }>;
  cachedVpsId = list?.[0]?.id ?? null;
  return cachedVpsId;
}

// Returns null when the integration isn't configured or Hostinger is
// unreachable — callers fall back to the local /proc reading.
export async function getVpsStats(): Promise<VpsStats | null> {
  const token = process.env.HOSTINGER_API_TOKEN;
  if (!token) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const vpsId = await resolveVpsId(token);
    if (!vpsId) return null;

    const now = new Date();
    // Month-to-date window: one call gives the full history (for sparklines +
    // current values) AND enough samples to sum the monthly traffic total.
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const qs = `date_from=${encodeURIComponent(from.toISOString())}&date_to=${encodeURIComponent(now.toISOString())}`;

    const [vmRes, metricsRes] = await Promise.all([
      fetch(`${API_BASE}/api/vps/v1/virtual-machines/${vpsId}`, { headers: authHeaders(token) }),
      fetch(`${API_BASE}/api/vps/v1/virtual-machines/${vpsId}/metrics?${qs}`, {
        headers: authHeaders(token),
      }),
    ]);
    if (!vmRes.ok || !metricsRes.ok) return null;

    const vm = (await vmRes.json()) as {
      cpus: number;
      memory: number; // MiB
      disk: number; // MiB
      bandwidth: number; // MiB / month
    };
    const metrics = (await metricsRes.json()) as MetricsResponse;

    const MiB = 1024 * 1024;
    const memTotal = vm.memory * MiB;
    const diskTotal = vm.disk * MiB;
    const bandwidthTotal = vm.bandwidth * MiB;

    const cpu = toSeries(metrics.cpu_usage);
    const ram = toSeries(metrics.ram_usage);
    const disk = toSeries(metrics.disk_space);
    const incoming = toSeries(metrics.incoming_traffic);
    const outgoing = toSeries(metrics.outgoing_traffic);
    const uptime = toSeries(metrics.uptime);

    // Only the tail is needed for a legible sparkline (48 pts ≈ last 24h at
    // Hostinger's ~30-min cadence).
    const tail = (v: number[]) => v.slice(-48);

    const ramUsed = last(ram.values);
    const diskUsed = last(disk.values);
    const bandwidthUsed =
      incoming.values.reduce((a, b) => a + b, 0) + outgoing.values.reduce((a, b) => a + b, 0);

    const data: VpsStats = {
      source: "hostinger",
      cpu: {
        percent: Math.round(last(cpu.values) * 10) / 10,
        cores: vm.cpus,
        history: tail(cpu.values.map((v) => Math.round(v * 10) / 10)),
      },
      memory: {
        total: memTotal,
        used: ramUsed,
        available: Math.max(0, memTotal - ramUsed),
        percent: pct(ramUsed, memTotal),
        history: tail(ram.values.map((b) => pct(b, memTotal))),
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        available: Math.max(0, diskTotal - diskUsed),
        percent: pct(diskUsed, diskTotal),
      },
      incoming: { latestBytes: last(incoming.values), history: tail(incoming.values) },
      outgoing: { latestBytes: last(outgoing.values), history: tail(outgoing.values) },
      bandwidth: {
        total: bandwidthTotal,
        used: bandwidthUsed,
        available: Math.max(0, bandwidthTotal - bandwidthUsed),
        percent: pct(bandwidthUsed, bandwidthTotal),
      },
      uptimeSeconds: last(uptime.values),
    };

    cache = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}
