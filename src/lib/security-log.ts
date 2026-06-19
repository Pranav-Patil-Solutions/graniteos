import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SecurityEventInput {
  companyId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  detail?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Best-effort: insert a row into public.security_events via the service-role
 * client (schema defined in supabase/migrations/0028_security_events.sql).
 *
 * NEVER throws. All errors are swallowed so a missing table, revoked key, or
 * network blip can never disrupt the auth flow. Fire-and-forget callers should
 * use `void logSecurityEvent(...)` to express intentional non-awaiting.
 *
 * Note: on Vercel serverless, background work that isn't awaited may be cut off
 * once the response is sent. Use `await logSecurityEvent(...)` in the few spots
 * where the log is critical; otherwise `void` is fine for soft telemetry.
 */
export async function logSecurityEvent(e: SecurityEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_events").insert({
      company_id: e.companyId ?? null,
      actor_user_id: e.actorUserId ?? null,
      event_type: e.eventType,
      detail: e.detail ?? {},
      ip: e.ip ?? null,
    });
  } catch {
    // Best-effort — never block the auth flow.
  }
}
