"use client";

import type { ImportModule, ParsedRow } from "@/lib/import/registry";

/**
 * Client-only Excel helpers. `xlsx` (SheetJS) is loaded lazily so it never
 * bloats the initial bundle and never runs on the server.
 */

function normalize(s: string): string {
  return s.replace(/\*/g, "").trim().toLowerCase();
}

/** Build & download a formatted .xlsx template for a module. */
export async function downloadTemplate(mod: ImportModule): Promise<void> {
  const XLSX = await import("xlsx");

  // --- Data sheet: header row + one worked example row ---
  const headers = mod.columns.map((c) => (c.required ? `${c.header} *` : c.header));
  const example = mod.columns.map((c) => c.example);
  const data = [headers, example];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = mod.columns.map((c) => ({
    wch: Math.max(14, c.header.length + 4, String(c.example).length + 2),
  }));

  // --- Instructions sheet: a clean data dictionary ---
  const info: (string | number)[][] = [
    ["GraniteOS — Import template", ""],
    [mod.label, mod.blurb],
    ["", ""],
    ["Column", "Required?", "Format / Allowed values", "Example"],
    ...mod.columns.map((c) => [
      c.header,
      c.required ? "REQUIRED" : "optional",
      c.note ?? typeLabel(c.type),
      c.example,
    ]),
    ["", "", "", ""],
    ["How to use", "1) Keep the header row exactly as-is.  2) Delete the example row.  3) Add one row per record.  4) Save and upload."],
  ];
  if (mod.dependsOn) {
    info.push(["Note", `Import "${mod.dependsOn}" before this sheet — rows link to it.`]);
  }
  const wsi = XLSX.utils.aoa_to_sheet(info);
  wsi["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 52 }, { wch: 22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.utils.book_append_sheet(wb, wsi, "Instructions");
  XLSX.writeFile(wb, `graniteos-${mod.key}-template.xlsx`);
}

/**
 * Read an uploaded .xlsx / .csv file, map columns to fields, and validate each
 * row with the module schema. Returns rows tagged ok/error for the preview.
 */
export async function parseFile(
  file: File,
  mod: ImportModule,
): Promise<{ rows: ParsedRow[]; headerError?: string }> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // Prefer a sheet literally named "Data", else the first sheet.
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === "data") ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) return { rows: [], headerError: "The file has no readable sheet." };

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (raw.length === 0) {
    return { rows: [], headerError: "No data rows found below the header." };
  }

  // Build a lookup from normalized uploaded header -> field
  const present = Object.keys(raw[0] ?? {});
  const headerToField = new Map<string, string>();
  for (const col of mod.columns) {
    const match = present.find((h) => normalize(h) === normalize(col.header));
    if (match) headerToField.set(match, col.field);
  }

  // Required columns must exist in the file
  const missing = mod.columns
    .filter((c) => c.required)
    .filter((c) => !Array.from(headerToField.values()).includes(c.field))
    .map((c) => c.header);
  if (missing.length) {
    return {
      rows: [],
      headerError: `Missing required column(s): ${missing.join(", ")}. Use the template's header row.`,
    };
  }

  const rows: ParsedRow[] = raw.map((r, i) => {
    const mapped: Record<string, unknown> = {};
    for (const [header, field] of headerToField) {
      const cell = r[header];
      mapped[field] = typeof cell === "string" ? cell.trim() : cell;
    }
    // skip fully-empty rows quietly by flagging them
    const allEmpty = Object.values(mapped).every((x) => x === "" || x == null);
    if (allEmpty) {
      return { rowNo: i + 1, data: mapped, ok: false, error: "Empty row — skipped" };
    }
    const parsed = mod.schema.safeParse(mapped);
    return parsed.success
      ? { rowNo: i + 1, data: mapped, ok: true }
      : { rowNo: i + 1, data: mapped, ok: false, error: parsed.error.issues[0].message };
  });

  return { rows };
}

function typeLabel(t: ImportModule["columns"][number]["type"]): string {
  switch (t) {
    case "money": return "Number (rupees)";
    case "number": return "Number";
    case "integer": return "Whole number";
    case "enum": return "Pick from allowed values";
    default: return "Text";
  }
}
