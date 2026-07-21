import { NextResponse } from "next/server";
import { deregisterTenantDomain } from "@/lib/coolify";

// Called by a Supabase Database Webhook (DELETE on public.companies) so a
// tenant's Coolify subdomain is torn down the moment its company row is
// removed — no matter whether the delete came from the app or straight SQL.
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const slug = payload?.old_record?.slug;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }

  const { deploymentUuid } = await deregisterTenantDomain(slug);
  return NextResponse.json({ ok: true, slug, deploymentUuid });
}
