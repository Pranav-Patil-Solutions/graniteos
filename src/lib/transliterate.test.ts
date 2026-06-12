import { describe, it, expect } from "vitest";
import { transliterate, hasDevanagari } from "./transliterate";

describe("transliterate", () => {
  it("renders common names with word-final schwa dropped", () => {
    expect(transliterate("राम")).toBe("raam");
    expect(transliterate("भारत")).toBe("bhaarat");
    expect(transliterate("कुमार")).toBe("kumaar");
    expect(transliterate("सुरेश")).toBe("suresh");
  });

  it("handles the virama (halant) consonant clusters", () => {
    expect(transliterate("नमस्ते")).toBe("namaste");
  });

  it("handles anusvara and matras together", () => {
    expect(transliterate("हिंदी")).toBe("hindee");
  });

  it("converts Devanagari digits", () => {
    expect(transliterate("१२३")).toBe("123");
  });

  it("passes Latin, spaces and punctuation through", () => {
    expect(transliterate("राम Traders")).toBe("raam Traders");
    expect(transliterate("ABC-123")).toBe("ABC-123");
  });

  it("returns empty/falsy input unchanged", () => {
    expect(transliterate("")).toBe("");
  });
});

describe("hasDevanagari", () => {
  it("detects Devanagari", () => {
    expect(hasDevanagari("राम")).toBe(true);
    expect(hasDevanagari("राम Traders")).toBe(true);
  });
  it("is false for pure Latin", () => {
    expect(hasDevanagari("Ram Traders")).toBe(false);
  });
});
