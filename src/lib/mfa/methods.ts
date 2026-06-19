// Shared MFA method types + display helpers. Pure (safe to unit-test / use anywhere).

export type MfaMethod = "authenticator" | "email" | "phone";

export const MFA_METHODS: MfaMethod[] = ["authenticator", "email", "phone"];

export const MFA_METHOD_LABEL: Record<MfaMethod, string> = {
  authenticator: "Authenticator App",
  email: "Email",
  phone: "Phone",
};

/** Methods that send a one-time code (vs. authenticator, which the user reads from an app). */
export function methodSendsCode(method: MfaMethod): boolean {
  return method === "email" || method === "phone";
}

/** "rajesh@gmail.com" → "ra•••@gmail.com" (keeps a recognisable hint, hides the rest). */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.indexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}•••@${domain}`;
}

/** "+919812345678" → "+91 ••••• 5678" (keeps country-ish prefix + last 4 digits). */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\s/g, "");
  if (d.length <= 4) return d;
  const last4 = d.slice(-4);
  const head = d.startsWith("+") ? d.slice(0, d.length - 4).slice(0, 3) : d.slice(0, 2);
  return `${head} ••••• ${last4}`;
}
