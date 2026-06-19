import { describe, it, expect } from "vitest";
import { signMfaToken, verifyMfaToken } from "./cookie";

const SID = "session-abc-123";
const NOW = 1_000_000_000_000;

describe("MFA cookie token", () => {
  it("round-trips: a freshly signed token verifies for its session", () => {
    const tok = signMfaToken(SID, NOW);
    expect(verifyMfaToken(tok, SID, NOW + 1000)).toBe(true);
  });

  it("rejects a token for a different session id", () => {
    const tok = signMfaToken(SID, NOW);
    expect(verifyMfaToken(tok, "other-session", NOW + 1000)).toBe(false);
  });

  it("rejects an expired token (past the 12h TTL)", () => {
    const tok = signMfaToken(SID, NOW);
    expect(verifyMfaToken(tok, SID, NOW + 13 * 60 * 60 * 1000)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const tok = signMfaToken(SID, NOW);
    const tampered = tok.slice(0, -2) + (tok.endsWith("aa") ? "bb" : "aa");
    expect(verifyMfaToken(tampered, SID, NOW + 1000)).toBe(false);
  });

  it("rejects a tampered payload (re-pointing to another session)", () => {
    const tok = signMfaToken(SID, NOW);
    const forgedBody = Buffer.from(`evil-session.${NOW + TTL()}`).toString("base64url");
    const forged = `${forgedBody}.${tok.slice(tok.lastIndexOf(".") + 1)}`;
    expect(verifyMfaToken(forged, "evil-session", NOW + 1000)).toBe(false);
  });

  it("rejects empty / malformed tokens", () => {
    expect(verifyMfaToken(undefined, SID, NOW)).toBe(false);
    expect(verifyMfaToken("", SID, NOW)).toBe(false);
    expect(verifyMfaToken("garbage", SID, NOW)).toBe(false);
    expect(verifyMfaToken(signMfaToken(SID, NOW), "", NOW)).toBe(false);
  });
});

function TTL() {
  return 12 * 60 * 60 * 1000;
}
