import { createAdminClient } from "@/lib/supabase/admin";

// Writes one row to public.audit_logs. The table has existed since the
// initial schema but nothing wrote to it yet — this is the first writer,
// scoped to the platform-admin company lifecycle actions (approve, reject,
// delete, activate, deactivate) surfaced in "Todas as Empresas". Always via
// service-role (there's no client insert policy, by design — see the core
// schema migration). Best-effort: a logging failure must never break the
// operation it's describing.
export async function logAudit(params: {
  tenantId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    tenant_id: params.tenantId,
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.error("[logAudit] insert failed:", error);
  }
}
