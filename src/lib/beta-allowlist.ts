// Beta access gate. While BETA_ALLOWED_LOGINS is set, only the listed
// emails/phones may start a session or create an account. Leave the env var
// empty in local dev to keep signup open. Set it (comma-separated) on the
// beta deployment so only the invited customer can get in.
//
//   BETA_ALLOWED_LOGINS=owner@granitecustomer.com,+919876543210

function normalize(v: string): string {
  return v.trim().toLowerCase();
}

function list(): string[] {
  return (process.env.BETA_ALLOWED_LOGINS ?? "")
    .split(",")
    .map(normalize)
    .filter(Boolean);
}

/** True when the beta gate is active (i.e. the env var is set). */
export function betaGateActive(): boolean {
  return list().length > 0;
}

/** True when this email/phone is allowed in. Open (true) when the gate is off. */
export function isAllowedLogin(value: string): boolean {
  const allowed = list();
  if (allowed.length === 0) return true; // gate off -> open (dev)
  return allowed.includes(normalize(value));
}

/** Whether new users may be auto-created for this login. Off while gated. */
export function mayCreateUser(): boolean {
  return !betaGateActive();
}
