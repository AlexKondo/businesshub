import { NextResponse } from "next/server";
import { statfs, readFile } from "node:fs/promises";
import os from "node:os";
import { createClient } from "@/lib/supabase/server";

// Platform-admin-only: live CPU / memory / disk of the VPS host, read from
// inside our own container. The app runs in Docker on a Hostinger KVM VPS, so
// /proc (via os.cpus / /proc/meminfo) and the root overlay (statfs) all report
// the VPS-wide figures — no SSH, no Coolify API, no stored credentials.
//
// NOT covered here (deliberately): network in/out and the monthly bandwidth
// quota. Inside the container we'd only see the virtual veth interface, not the
// VPS's public NIC, and the monthly quota lives only in Hostinger's panel/API.
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
  // Prefer /proc/meminfo's MemAvailable (accounts for reclaimable cache, so it
  // matches what dashboards like Hostinger's report). Fall back to os.* if the
  // file isn't there (e.g. non-Linux dev machine).
  try {
    const info = await readFile("/proc/meminfo", "utf8");
    const kb = (key: string) => {
      const m = info.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, "m"));
      return m ? Number(m[1]) * 1024 : null;
    };
    const total = kb("MemTotal");
    const available = kb("MemAvailable");
    if (total && available !== null) {
      return { total, available, used: total - available };
    }
  } catch {
    // fall through to os.*
  }
  const total = os.totalmem();
  const free = os.freemem();
  return { total, available: free, used: total - free };
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
    // CPU% needs two samples of the cumulative counters, a beat apart.
    const a = cpuSnapshot();
    await new Promise((r) => setTimeout(r, 300));
    const b = cpuSnapshot();
    const idleDiff = b.idle - a.idle;
    const totalDiff = b.total - a.total;
    const cpuPercent =
      totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 1000) / 10 : 0;

    const mem = await readMemory();
    const s = await statfs("/");
    const diskTotal = s.blocks * s.bsize;
    const diskFree = s.bfree * s.bsize;
    const diskAvailable = s.bavail * s.bsize;
    const diskUsed = diskTotal - diskFree;

    const pct = (used: number, total: number) =>
      total > 0 ? Math.round((used / total) * 1000) / 10 : 0;

    return NextResponse.json({
      cpu: { percent: cpuPercent, cores: os.cpus().length },
      memory: {
        total: mem.total,
        used: mem.used,
        available: mem.available,
        percent: pct(mem.used, mem.total),
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        available: diskAvailable,
        percent: pct(diskUsed, diskTotal),
      },
      uptimeSeconds: os.uptime(),
    });
  } catch (err) {
    console.error("[system/stats] failed:", err);
    return NextResponse.json({ error: "stats_failed" }, { status: 500 });
  }
}
