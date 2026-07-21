import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const uuid = new URL(request.url).searchParams.get("uuid");
  if (!uuid) {
    return NextResponse.json({ error: "missing uuid" }, { status: 400 });
  }

  const base = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;

  const res = await fetch(`${base}/api/v1/deployments/${uuid}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  return NextResponse.json({ status: data.status ?? "unknown" });
}
