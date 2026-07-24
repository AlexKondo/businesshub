import { NextResponse } from "next/server";
import { statfs } from "node:fs/promises";
import { createClient } from "@/lib/supabase/server";

// Platform-admin-only: disk usage of the VPS host, read from inside our own
// container. The app runs in a Docker container on the Hostinger VPS whose
// root filesystem is an overlay backed by the host's main disk, so statfs("/")
// reports the host disk's real total/used/free — no SSH, no Coolify API, no
// stored credentials. Refreshed on demand (a button in the dashboard) and can
// be polled hourly client-side.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const s = await statfs("/");
    // bsize = fundamental block size; blocks = total, bfree = free (incl.
    // root-reserved), bavail = free to unprivileged users. "used" is derived
    // from total-free so it matches what `df` reports for the mount.
    const total = s.blocks * s.bsize;
    const free = s.bfree * s.bsize;
    const available = s.bavail * s.bsize;
    const used = total - free;
    return NextResponse.json({
      total,
      used,
      free,
      available,
      usedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
    });
  } catch (err) {
    console.error("[system/disk] statfs failed:", err);
    return NextResponse.json({ error: "statfs_failed" }, { status: 500 });
  }
}
