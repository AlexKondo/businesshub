import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureSupplierMembership } from "@/lib/supplier-membership";

// Exchanges the Supabase email confirmation / invite code for a session,
// then sends the user into the app. Lives outside [locale] on purpose —
// the link embedded in emails must be a fixed path.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en-US/dashboard";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://businesshub.app.br";
  const root = appUrl.replace(/^https?:\/\//, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Enforce a single active session per account (see login-form.tsx for
      // the primary enforcement point) — best-effort, a failure here
      // shouldn't block the confirmation that already succeeded.
      await supabase.auth.signOut({ scope: "others" }).catch(() => null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const pendingSupplierTenantId = user.user_metadata?.pending_supplier_tenant_id as
          | string
          | undefined;

        if (pendingSupplierTenantId) {
          const slug = await ensureSupplierMembership(user.id, pendingSupplierTenantId);
          if (slug) {
            return NextResponse.redirect(`https://${slug}.${root}${next}`);
          }
          return NextResponse.redirect(`${appUrl}/en-US/login`);
        }

        const { data: membership } = await supabase
          .from("memberships")
          .select("companies(slug)")
          .limit(1)
          .maybeSingle<{ companies: { slug: string } | null }>();

        const slug = membership?.companies?.slug;
        if (slug) {
          return NextResponse.redirect(`https://${slug}.${root}${next}`);
        }
      }

      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${appUrl}/en-US/login`);
}
