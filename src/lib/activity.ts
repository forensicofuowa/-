import { createAdminClient } from "@/lib/supabase/admin";

export async function logActivity(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("activity_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("[activity_log] failed:", err);
  }
}
