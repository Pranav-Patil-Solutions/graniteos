"use server";

import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { isWhatsAppConnected, sendTemplate, normalizePhone } from "@/lib/whatsapp";

export type BroadcastResult = {
  ok: boolean;
  sent: number;
  failed: number;
  total: number;
  errors: string[];
  notConnected?: boolean;
};

/**
 * Path B — hands-off auto-send. Fires the approved "new stock" template to every
 * opted-in customer via the WhatsApp Business API. No subscription/billing: it
 * simply uses the configured API creds, or reports "not connected".
 *
 * `bodyParams` are the template's single-line {{1}},{{2}},{{3}} values, built on
 * the client (company name, one-line stock summary, catalogue URL).
 */
export async function broadcastNewStock(bodyParams: string[]): Promise<BroadcastResult> {
  const me = await requireSession();
  if (!can(me.role, "createQuote"))
    return { ok: false, sent: 0, failed: 0, total: 0, errors: ["Not permitted"] };

  if (!isWhatsAppConnected())
    return {
      ok: false,
      sent: 0,
      failed: 0,
      total: 0,
      errors: ["WhatsApp Business API not connected"],
      notConnected: true,
    };

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("parties")
    .select("phone")
    .eq("kind", "customer")
    .eq("notify_new_stock", true);

  const targets = (customers ?? [])
    .map((c) => (c.phone as string | null)?.trim())
    .filter((p): p is string => !!p)
    .map(normalizePhone)
    .filter((p) => p.length >= 11);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Sequential to stay gentle on rate limits; fine for an SMB customer list.
  for (const to of targets) {
    const r = await sendTemplate(to, bodyParams);
    if (r.ok) sent++;
    else {
      failed++;
      if (errors.length < 5 && !errors.includes(r.error)) errors.push(r.error);
    }
  }

  return { ok: failed === 0 && sent > 0, sent, failed, total: targets.length, errors };
}
