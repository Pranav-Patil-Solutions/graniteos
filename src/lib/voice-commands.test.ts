import { describe, it, expect } from "vitest";
import { parseCommand } from "./voice-commands";

describe("parseCommand", () => {
  it("navigates on a bare section word", () => {
    expect(parseCommand("customers")).toEqual({ kind: "navigate", href: "/parties", label: "Customers" });
  });

  it("navigates with an English verb prefix", () => {
    expect(parseCommand("open measurement sheet")).toEqual({
      kind: "navigate", href: "/measure", label: "Measurement Sheet",
    });
  });

  it("navigates with a Hindi verb", () => {
    expect(parseCommand("kholo daybook")).toEqual({ kind: "navigate", href: "/daybook", label: "Daybook" });
  });

  it("prefers the longer keyword (batch payment over payment)", () => {
    expect(parseCommand("batch payment").href).toBe("/batch-payment");
    expect(parseCommand("money").href).toBe("/money");
  });

  it("extracts a search query after a verb", () => {
    expect(parseCommand("search for black galaxy")).toEqual({ kind: "search", query: "black galaxy" });
    expect(parseCommand("khojo rajesh")).toEqual({ kind: "search", query: "rajesh" });
  });

  it("falls back to search for unrecognised speech", () => {
    expect(parseCommand("Statuario marble 18mm")).toEqual({ kind: "search", query: "Statuario marble 18mm" });
  });

  it("returns none for empty or verb-only input", () => {
    expect(parseCommand("   ").kind).toBe("none");
    expect(parseCommand("search").kind).toBe("none");
  });
});
