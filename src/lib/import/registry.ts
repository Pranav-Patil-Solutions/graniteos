import { z } from "zod";
import {
  STONE_FINISHES,
  STONE_GRADES,
  SLAB_THICKNESSES_MM,
  CUSTOMER_TYPES,
  SUPPLIER_TYPES,
  FAB_MACHINES,
} from "@/lib/validation";

/**
 * The bulk-import registry. ONE source of truth, shared by:
 *  - the client wizard (column metadata + Excel template + instant preview validation)
 *  - the server action (authoritative re-validation before insert)
 *
 * Each module validates the EXACT columns of its Excel template, so the data that
 * reaches the database is already clean (required fields, numbers, allowed values).
 */

export type ImportColType = "text" | "number" | "integer" | "money" | "enum";

export type ImportColumn = {
  /** Excel header text — must match the template exactly. */
  header: string;
  /** Internal field key the schema validates. */
  field: string;
  type: ImportColType;
  required?: boolean;
  /** Allowed values for `enum` columns. */
  enumValues?: readonly string[];
  /** Shown in the template's example row. */
  example: string | number;
  /** Plain-English help shown on the Instructions sheet. */
  note?: string;
};

export type ImportModule = {
  key: string;
  label: string;
  /** Target table (informational). */
  table: string;
  blurb: string;
  /** Another module that must be imported first (e.g. slabs need blocks). */
  dependsOn?: string;
  columns: ImportColumn[];
  /** Validates a single mapped row ({field: value}). */
  schema: z.ZodType<Record<string, unknown>>;
};

/* ------------------------------------------------------------------ helpers */

const blank = z.literal("");

/** Optional free text, capped. Blank allowed. */
const text = (max: number) => z.string().trim().max(max).optional().or(blank);

/** Required free text. */
const reqText = (max: number) =>
  z.string().trim().min(1, "Required").max(max);

/** Optional number >= 0. Blank allowed. Accepts strings from Excel. */
const num = () =>
  z.union([blank, z.coerce.number().min(0, "Must be 0 or more")]).optional();

/** Required number > 0. */
const reqPos = (label: string) =>
  z.coerce.number({ message: `${label} must be a number` }).positive(`${label} must be greater than 0`);

/** Optional integer >= 0. */
const intNum = () =>
  z.union([blank, z.coerce.number().int("Must be a whole number").min(0)]).optional();

/** Optional value that must (case-insensitively) be one of `vals`. Blank allowed. */
const enumField = (vals: readonly string[]) =>
  z
    .string()
    .trim()
    .optional()
    .or(blank)
    .refine(
      (v) => !v || vals.some((x) => x.toLowerCase() === v.toLowerCase()),
      { message: `Must be one of: ${vals.join(", ")}` },
    );

/** Canonicalise an enum value to the exact stored casing (e.g. "polished" -> "Polished"). */
export function canonicalEnum(
  value: string | undefined | null,
  vals: readonly string[],
): string | null {
  if (!value) return null;
  const hit = vals.find((x) => x.toLowerCase() === String(value).trim().toLowerCase());
  return hit ?? null;
}

/* ----------------------------------------------------------------- modules */

const customers: ImportModule = {
  key: "customers",
  label: "Customers",
  table: "parties",
  blurb: "Your buyers — builders, architects, dealers. Put what they already owe you in Opening Balance.",
  columns: [
    { header: "Name", field: "name", type: "text", required: true, example: "Sai Constructions", note: "Required. The customer / firm name." },
    { header: "Type", field: "partyType", type: "enum", enumValues: CUSTOMER_TYPES, example: "Builder", note: `Optional. One of: ${CUSTOMER_TYPES.join(", ")}` },
    { header: "Phone", field: "phone", type: "text", example: "9876543210", note: "Optional. Mobile number." },
    { header: "Email", field: "email", type: "text", example: "sai@example.com", note: "Optional." },
    { header: "City", field: "city", type: "text", example: "Hyderabad", note: "Optional." },
    { header: "Address", field: "address", type: "text", example: "Plot 12, Madhapur", note: "Optional." },
    { header: "GSTIN", field: "gstin", type: "text", example: "36ABCDE1234F1Z5", note: "Optional. 15-character GST number." },
    { header: "Legal Name", field: "legalName", type: "text", example: "Sai Constructions Pvt Ltd", note: "Optional. Name as printed on invoices." },
    { header: "Credit Limit (Rs)", field: "creditLimitRupees", type: "money", example: 200000, note: "Optional. In rupees." },
    { header: "Opening Balance (Rs)", field: "openingBalanceRupees", type: "money", example: 35000, note: "Optional. What they owe you right now, in rupees." },
    { header: "Notes", field: "notes", type: "text", example: "Repeat client", note: "Optional." },
  ],
  schema: z.object({
    name: reqText(100),
    partyType: enumField(CUSTOMER_TYPES),
    phone: text(20),
    email: text(120),
    city: text(60),
    address: text(200),
    gstin: text(20),
    legalName: text(120),
    creditLimitRupees: num(),
    openingBalanceRupees: num(),
    notes: text(300),
  }),
};

const suppliers: ImportModule = {
  key: "suppliers",
  label: "Suppliers",
  table: "parties",
  blurb: "Quarries, block suppliers, processors, transporters. Opening Balance = what you owe them.",
  columns: [
    { header: "Name", field: "name", type: "text", required: true, example: "Rajasthan Quarries", note: "Required." },
    { header: "Type", field: "partyType", type: "enum", enumValues: SUPPLIER_TYPES, example: "Quarry", note: `Optional. One of: ${SUPPLIER_TYPES.join(", ")}` },
    { header: "Phone", field: "phone", type: "text", example: "9812345678", note: "Optional." },
    { header: "Email", field: "email", type: "text", example: "info@rajquarry.com", note: "Optional." },
    { header: "City", field: "city", type: "text", example: "Kishangarh", note: "Optional." },
    { header: "Address", field: "address", type: "text", example: "NH-8, Kishangarh", note: "Optional." },
    { header: "GSTIN", field: "gstin", type: "text", example: "08ABCDE1234F1Z5", note: "Optional." },
    { header: "Legal Name", field: "legalName", type: "text", example: "Rajasthan Quarries LLP", note: "Optional." },
    { header: "Opening Balance (Rs)", field: "openingBalanceRupees", type: "money", example: 120000, note: "Optional. What you owe them, in rupees." },
    { header: "Notes", field: "notes", type: "text", example: "Black galaxy source", note: "Optional." },
  ],
  schema: z.object({
    name: reqText(100),
    partyType: enumField(SUPPLIER_TYPES),
    phone: text(20),
    email: text(120),
    city: text(60),
    address: text(200),
    gstin: text(20),
    legalName: text(120),
    openingBalanceRupees: num(),
    notes: text(300),
  }),
};

const blocks: ImportModule = {
  key: "blocks",
  label: "Blocks",
  table: "blocks",
  blurb: "Raw stone blocks. Import these first — slabs attach to a block by its label.",
  columns: [
    { header: "Block Label", field: "label", type: "text", required: true, example: "BLK-001", note: "Required. Your block number / name. Must be unique enough to match slabs to." },
    { header: "Material", field: "material", type: "text", required: true, example: "Black Galaxy", note: "Required. Stone name." },
    { header: "Color", field: "color", type: "text", example: "Black", note: "Optional." },
    { header: "Length (cm)", field: "lengthCm", type: "number", example: 280, note: "Optional. Block length." },
    { header: "Width (cm)", field: "widthCm", type: "number", example: 160, note: "Optional." },
    { header: "Height (cm)", field: "heightCm", type: "number", example: 150, note: "Optional." },
    { header: "Weight (tonnes)", field: "weightTonnes", type: "number", example: 18.5, note: "Optional." },
    { header: "Origin", field: "origin", type: "text", example: "Ongole", note: "Optional. Quarry / source." },
    { header: "Supplier", field: "supplier", type: "text", example: "Rajasthan Quarries", note: "Optional." },
    { header: "Cost (Rs)", field: "costRupees", type: "money", example: 450000, note: "Optional. Block purchase cost, in rupees." },
  ],
  schema: z.object({
    label: reqText(80),
    material: reqText(60),
    color: text(60),
    lengthCm: num(),
    widthCm: num(),
    heightCm: num(),
    weightTonnes: num(),
    origin: text(60),
    supplier: text(80),
    costRupees: num(),
  }),
};

const slabs: ImportModule = {
  key: "slabs",
  label: "Slabs",
  table: "slabs",
  dependsOn: "blocks",
  blurb: "Cut slabs. Each row links to a block by Block Label — so import Blocks first.",
  columns: [
    { header: "Block Label", field: "blockLabel", type: "text", required: true, example: "BLK-001", note: "Required. Must match a Block Label you already imported." },
    { header: "Bundle No", field: "bundleNo", type: "text", example: "B-204", note: "Optional." },
    { header: "Slab No", field: "slabNo", type: "integer", example: 7, note: "Optional. Whole number." },
    { header: "Length (in)", field: "lengthIn", type: "number", required: true, example: 126, note: "Required. Gross length in inches (used to compute sq.ft)." },
    { header: "Width (in)", field: "widthIn", type: "number", required: true, example: 78, note: "Required. Gross width in inches." },
    { header: "Net Sqft", field: "netSqft", type: "number", example: 64, note: "Optional. Usable area after defects." },
    { header: "Thickness (mm)", field: "thicknessMm", type: "number", example: 18, note: `Optional. Common: ${SLAB_THICKNESSES_MM.join(", ")}` },
    { header: "Finish", field: "finish", type: "enum", enumValues: STONE_FINISHES, example: "Polished", note: `Optional. One of: ${STONE_FINISHES.join(", ")}` },
    { header: "Grade", field: "grade", type: "enum", enumValues: STONE_GRADES, example: "Premium", note: `Optional. One of: ${STONE_GRADES.join(", ")}` },
    { header: "Godown", field: "godown", type: "text", example: "Unit-2", note: "Optional. Storage location." },
    { header: "Rate (Rs/sqft)", field: "rateRupees", type: "money", example: 220, note: "Optional. Selling rate per sq.ft, in rupees." },
  ],
  schema: z.object({
    blockLabel: reqText(80),
    bundleNo: text(40),
    slabNo: intNum(),
    lengthIn: reqPos("Length"),
    widthIn: reqPos("Width"),
    netSqft: num(),
    thicknessMm: num(),
    finish: enumField(STONE_FINISHES),
    grade: enumField(STONE_GRADES),
    godown: text(60),
    rateRupees: num(),
  }),
};

const jobs: ImportModule = {
  key: "jobs",
  label: "Production Jobs",
  table: "production_jobs",
  blurb: "Cutting / polishing jobs to seed your fabrication board.",
  columns: [
    { header: "Title", field: "title", type: "text", required: true, example: "Kitchen counter — Sai", note: "Required. What the job is." },
    { header: "Material", field: "material", type: "text", example: "Black Galaxy", note: "Optional." },
    { header: "Qty Sqft", field: "qtySqft", type: "number", example: 64, note: "Optional. Area to fabricate." },
    { header: "Machine", field: "machine", type: "enum", enumValues: FAB_MACHINES, example: "Polishing Line", note: `Optional. One of: ${FAB_MACHINES.join(", ")}` },
    { header: "Notes", field: "notes", type: "text", example: "Edge polish both sides", note: "Optional." },
  ],
  schema: z.object({
    title: reqText(120),
    material: text(60),
    qtySqft: num(),
    machine: enumField(FAB_MACHINES),
    notes: text(300),
  }),
};

export const IMPORT_MODULES: ImportModule[] = [
  customers,
  suppliers,
  blocks,
  slabs,
  jobs,
];

export function getImportModule(key: string): ImportModule | undefined {
  return IMPORT_MODULES.find((m) => m.key === key);
}

/** Document modules that are intentionally created inside the app, not imported. */
export const IN_APP_MODULES = [
  { label: "Quotes", reason: "Built from your customers + slabs, with automatic GST per line." },
  { label: "Orders", reason: "Confirmed from a quote — keeps the quote→order→invoice chain intact." },
  { label: "Invoices", reason: "Generated from an order so GST numbers are always correct & legal." },
  { label: "Payments", reason: "Recorded against an invoice. Opening dues go in a customer's Opening Balance instead." },
] as const;

/** Map a validated row to the value a column should show — used by the preview. */
export type ParsedRow = {
  /** 1-based row number in the sheet (after the header). */
  rowNo: number;
  /** Raw {field: value} mapped from the Excel columns. */
  data: Record<string, unknown>;
  ok: boolean;
  error?: string;
};
