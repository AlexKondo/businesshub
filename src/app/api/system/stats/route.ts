import { NextResponse } from "next/server";
import { statfs, readFile } from "node:fs/promises";
import os from "node:os";
import { createClient } from "@/lib/supabase/server";
import { getVpsStats } from "@/lib/hostinger";

// Platform-admin-only: CPU / memory / disk / network of the VPS host.
//
// Primary source is the Hostinger API (real history for sparklines + inbound/
// outbound traffic + monthly bandwidth), mirroring the hPanel overview. If the
// integration isn't configured or Hostinger is unreachable, we fall back to a
// local reading from inside our own container — /proc (CPU/memory) + statfs
// (disk) — which still gives live CPU/memory/disk but no traffic/bandwidth.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cpuSnapshot(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const v of Object.values(cpu.times)) total += v;
    idle += cpu.times.idle;
  }
  return { idle, total };
}

async function readMemory(): Promise<{ total: number; used: number; available: number }> {
  try {
    const info = await readFile("/proc/meminfo", "utf8");
    const kb = (key: string) => {
      const m = info.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, "m"));
      return m ? Number(m[1]) * 1024 : null;
    };
    const total = kb("MemTotal");
    const available = kb("MemAvailable");
    if (total && available !== null) return { total, available, used: total - available };
  } catch {
    // fall through to os.*
  }
  const total = os.totalmem();
  const free = os.freemem();
  return { total, available: free, used: total - free };
}

async function localStats() {
  const a = cpuSnapshot();
  await new Promise((r) => setTimeout(r, 300));
  const b = cpuSnapshot();
  const idleDiff = b.idle - a.idle;
  const totalDiff = b.total - a.total;
  const cpuPercent = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 1000) / 10 : 0;

  const mem = await readMemory();
  const s = await statfs("/");
  const diskTotal = s.blocks * s.bsize;
  const diskFree = s.bfree * s.bsize;
  const diskAvailable = s.bavail * s.bsize;
  const diskUsed = diskTotal - diskFree;
  const pct = (used: number, total: number) =>
    total > 0 ? Math.round((used / total) * 1000) / 10 : 0;

  return {
    source: "proc" as const,
    cpu: { percent: cpuPercent, cores: os.cpus().length, history: [] as number[] },
    memory: {
      total: mem.total,
      used: mem.used,
      available: mem.available,
      percent: pct(mem.used, mem.total),
      history: [] as number[],
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      available: diskAvailable,
      percent: pct(diskUsed, diskTotal),
    },
    incoming: null,
    outgoing: null,
    bandwidth: null,
    uptimeSeconds: os.uptime(),
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!platformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const hostinger = await getVpsStats();
    if (hostinger) return NextResponse.json(hostinger);
    return NextResponse.json(await localStats());
  } catch (err) {
    console.error("[system/stats] failed:", err);
    return NextResponse.json({ error: "stats_failed" }, { status: 500 });
  }
}
