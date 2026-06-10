import "server-only";

/**
 * WhatsApp Business API client (Path B — hands-off auto-send).
 *
 * Official Meta Cloud API by default; set WHATSAPP_API_BASE to point at a BSP
 * (Gupshup/WATI/etc.) that mirrors the same endpoint shape. No subscription /
 * billing logic here — just the send capability. If creds are absent the app
 * degrades to the manual one-tap (Path A) flow.
 *
 * Required env to enable:
 *   WHATSAPP_TOKEN              — permanent access token
 *   WHATSAPP_PHONE_NUMBER_ID    — the sender phone-number id
 * Optional:
 *   WHATSAPP_API_BASE           — default https://graph.facebook.com/v21.0
 *   WHATSAPP_STOCK_TEMPLATE     — approved marketing template name (default new_stock_alert)
 *   WHATSAPP_TEMPLATE_LANG      — template language code (default en)
 */

type WaConfig = { token: string; phoneId: string; apiBase: string };

export function whatsappConfig(): WaConfig | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  return {
    token,
    phoneId,
    apiBase: process.env.WHATSAPP_API_BASE || "https://graph.facebook.com/v21.0",
  };
}

export function isWhatsAppConnected(): boolean {
  return whatsappConfig() !== null;
}

export const stockTemplate = () => process.env.WHATSAPP_STOCK_TEMPLATE || "new_stock_alert";
export const templateLang = () => process.env.WHATSAPP_TEMPLATE_LANG || "en";

/** Digits only; prefix 91 for a bare 10-digit Indian number. Cloud API wants no '+'. */
export function normalizePhone(phone: string): string {
  let d = (phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return d;
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Send an APPROVED template message — required for business-initiated /
 * marketing messages on WhatsApp. `bodyParams` fill the template's {{1}}, {{2}}…
 * (must be single-line: no newlines/tabs per Meta's rules).
 */
export async function sendTemplate(
  to: string,
  bodyParams: string[],
): Promise<SendResult> {
  const cfg = whatsappConfig();
  if (!cfg) return { ok: false, error: "WhatsApp Business API not connected" };

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: stockTemplate(),
      language: { code: templateLang() },
      components: bodyParams.length
        ? [{ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: t })) }]
        : [],
    },
  };

  try {
    const res = await fetch(`${cfg.apiBase}/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      messages?: { id?: string }[];
    };
    if (!res.ok) return { ok: false, error: j?.error?.message || `HTTP ${res.status}` };
    return { ok: true, id: j?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
