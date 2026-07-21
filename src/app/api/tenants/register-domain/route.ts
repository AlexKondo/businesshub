import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerTenantDomain } from "@/lib/coolify";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await request.json();
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  // confirm the caller actually owns a membership in this tenant before
  // touching infra on their behalf
  const { data: membership } = await supabase
    .from("memberships")
    .select("companies!inner(slug)")
    .eq("companies.slug", slug)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { deploymentUuid } = await registerTenantDomain(slug);
  return NextResponse.json({ deploymentUuid });
}
