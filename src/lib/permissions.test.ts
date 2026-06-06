import { describe, it, expect } from "vitest";
import { can } from "./permissions";

describe("can()", () => {
  it("lets only the owner invite team members", () => {
    expect(can("owner", "inviteTeamMember")).toBe(true);
    expect(can("sales_manager", "inviteTeamMember")).toBe(false);
    expect(can("store_manager", "inviteTeamMember")).toBe(false);
  });

  it("lets owner and sales_manager create quotes", () => {
    expect(can("owner", "createQuote")).toBe(true);
    expect(can("sales_manager", "createQuote")).toBe(true);
    expect(can("store_manager", "createQuote")).toBe(false);
  });

  it("lets store_manager log inward receipts", () => {
    expect(can("store_manager", "logInwardReceipt")).toBe(true);
    expect(can("sales_manager", "logInwardReceipt")).toBe(false);
  });
});
