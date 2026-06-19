"use client";

import type { ImportModule, ParsedRow } from "@/lib/import/registry";

/**
 * Client-only Excel helpers. `exceljs` (npm-published, auditable) is loaded
 * lazily so it never bloats the initial bundle and never runs on the server.
 *
 * Replaces the CDN-sourced SheetJS tarball (CVE-2023-30533, prototype pollution).
 */

function normalize(s: string): string {
  return s.replace(/\*/g, "").trim().toLowerCase();
}

/**
 * Unwrap an exceljs cell value to a plain primitive.
 * Handles RichText, formula results, and null → "".
 */
function cellValue(v: unknown): unknown {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    // RichTextValue: { richText: [{ text: string }, ...] }
    if ("richText" in (v as Record<string, unknown>)) {
      const rt = v as { richText: { text: string }[] };
      return rt.richText.map((r) => r.text).join("") || "";
    }
    // FormulaValue: { formula: string; result: unknown }
    if ("result" in (v as Record<string, unknown>)) {
      return cellValue((v as { result: unknown }).result);
    }
    // Date objects — return as-is; validators coerce to string when needed
    if (v instanceof Date) return v;
  }
  return v;
}

/** Build & download a formatted .xlsx template for a module. */
export async function downloadTemplate(mod: ImportModule): Promise<void> {
  // Dynamic import keeps exceljs out of the initial bundle
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  // --- Data sheet: header row + one worked example row ---
  const headers = mod.columns.map((c) => (c.required ? `${c.header} *` : c.header));
  const example = mod.columns.map((c) => c.example);
  const ws = workbook.addWorksheet("Data");
  ws.addRow(headers);
  ws.addRow(example as unknown[]);
  // Set column widths after rows are in place
  mod.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(14, c.header.length + 4, String(c.example).length + 2);
  });

  // --- Instructions sheet: a clean data dictionary ---
  const info: (string | number | undefined)[][] = [
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
    [
      "How to use",
      "1) Keep the header row exactly as-is.  2) Delete the example row.  3) Add one row per record.  4) Save and upload.",
    ],
  ];
  if (mod.dependsOn) {
    info.push(["Note", `Import "${mod.dependsOn}" before this sheet — rows link to it.`]);
  }
  const wsi = workbook.addWorksheet("Instructions");
  for (const row of info) {
    wsi.addRow(row as unknown[]);
  }
  [22, 12, 52, 22].forEach((w, i) => {
    wsi.getColumn(i + 1).width = w;
  });

  // exceljs has no writeFile in-browser — write to a Buffer, then download via Blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `graniteos-${mod.key}-template.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Parse a single CSV line, handling double-quoted fields and RFC-4180
 * escaped quotes ("" → ").
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote inside a quoted field
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ---------------------------------------------------------------------------
// parseFile — xlsx or csv
// ---------------------------------------------------------------------------

/**
 * Read an uploaded .xlsx / .csv file, map columns to fields, and validate each
 * row with the module schema. Returns rows tagged ok/error for the preview.
 *
 * Behavior notes vs. previous SheetJS implementation:
 *  - .xlsx: exceljs only supports Office Open XML (.xlsx). Legacy .xls binary
 *    files will throw; the caller in ImportWizard already catches this and
 *    shows a user-friendly message.
 *  - .csv: lightweight RFC-4180 parser (exceljs csv.read needs a Node stream,
 *    unavailable in browser). Handles quoted fields and "" escaping; tab-
 *    delimited CSVs are not supported.
 */
export async function parseFile(
  file: File,
  mod: ImportModule,
): Promise<{ rows: ParsedRow[]; headerError?: string }> {
  let raw: Record<string, unknown>[];

  const isCsv = /\.csv$/i.test(file.name);

  if (isCsv) {
    // ── CSV path ──────────────────────────────────────────────────────────
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const csvHeaders = parseCsvLine(lines[0] ?? "");
    if (csvHeaders.every((h) => !h.trim())) {
      return { rows: [], headerError: "The file has no readable sheet." };
    }
    const dataLines = lines.slice(1).filter((l) => l.trim() !== "");
    if (dataLines.length === 0) {
      return { rows: [], headerError: "No data rows found below the header." };
    }
    raw = dataLines.map((line) => {
      const values = parseCsvLine(line);
      const obj: Record<string, unknown> = {};
      csvHeaders.forEach((h, j) => {
        obj[h] = values[j] ?? "";
      });
      return obj;
    });
  } else {
    // ── .xlsx path ────────────────────────────────────────────────────────
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buf = await file.arrayBuffer();
    await workbook.xlsx.load(buf);

    // Prefer a sheet literally named "Data" (case-insensitive), else first sheet
    const ws =
      workbook.worksheets.find((w) => w.name.toLowerCase() === "data") ??
      workbook.worksheets[0];
    if (!ws) return { rows: [], headerError: "The file has no readable sheet." };

    // exceljs row.values is 1-indexed: [null, "Header1", "Header2", ...]
    const headerValues = ws.getRow(1).values as (string | null | undefined)[];

    raw = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header row
      const obj: Record<string, unknown> = {};
      headerValues.forEach((h, colIdx) => {
        if (!h) return; // colIdx 0 is always null in exceljs
        obj[h] = cellValue(row.getCell(colIdx).value);
      });
      raw.push(obj);
    });
  }

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
    case "money":
      return "Number (rupees)";
    case "number":
      return "Number";
    case "integer":
      return "Whole number";
    case "enum":
      return "Pick from allowed values";
    default:
      return "Text";
  }
}
