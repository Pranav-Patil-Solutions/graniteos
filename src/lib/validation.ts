import { z } from "zod";

// Accepts any country (E.164), e.g. +91… or +49…. Spaces, dashes and brackets
// are stripped so users can type "+49 151 2345 6789" naturally; the cleaned
// value (e.g. "+4915123456789") is what gets sent to Supabase.
export const phoneSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s\-()]/g, "") : v),
  z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number"),
);

export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password is too long");

export const gstSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GST number",
  );

export const companySetupSchema = z.object({
  companyName: z.string().trim().min(2).max(100),
  city: z.string().trim().min(1, "City is required"),
  ownerName: z.string().trim().min(2).max(60),
  phone: phoneSchema.optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  gstNumber: gstSchema.optional().or(z.literal("")),
  productKey: z
    .string()
    .trim()
    .min(1, "Product key is required")
    .max(40)
    .regex(/^[A-Za-z0-9\- ]+$/, "Product key can only contain letters, numbers and dashes"),
});

const numericFromInput = z.coerce.number();

// Industry-standard option lists for the stone trade.
export const STONE_FINISHES = [
  "Polished",
  "Honed",
  "Leather",
  "Flamed",
  "Brushed",
  "Sandblasted",
] as const;
export const STONE_GRADES = ["Premium", "Standard", "Commercial"] as const;
export const SLAB_THICKNESSES_MM = [16, 18, 20, 30] as const;

// Units of measure for the stone trade. `uqc` is the GST Unit Quantity Code
// that must appear on a tax invoice (e.g. running-feet bills under MTR).
export const UOM = [
  { code: "SQF", label: "Sq. Feet", uqc: "SQF" },
  { code: "SQM", label: "Sq. Metre", uqc: "SQM" },
  { code: "RFT", label: "Running Feet", uqc: "MTR" },
  { code: "RMT", label: "Running Metre", uqc: "MTR" },
  { code: "NOS", label: "Pieces (Nos)", uqc: "NOS" },
  { code: "SLB", label: "Slab", uqc: "NOS" },
  { code: "SET", label: "Set", uqc: "SET" },
  { code: "BDL", label: "Bundle", uqc: "BDL" },
  { code: "CBM", label: "Cubic Metre", uqc: "CBM" },
  { code: "TON", label: "Tonne", uqc: "TON" },
] as const;
export const UOM_CODES = UOM.map((u) => u.code);
export const DEFAULT_UOM = "SQF";
export type UomCode = (typeof UOM)[number]["code"];

/** Human label for a UOM code, falling back to the raw code. */
export function uomLabel(code: string | null | undefined): string {
  return UOM.find((u) => u.code === code)?.label ?? code ?? "SQF";
}
/** GST Unit Quantity Code for a UOM code (what goes on the tax invoice). */
export function uomUqc(code: string | null | undefined): string {
  return UOM.find((u) => u.code === code)?.uqc ?? "OTH";
}

const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const blockSchema = z.object({
  label: z.string().trim().min(1, "Give the block a name / number").max(80),
  material: z.string().trim().min(1, "Material is required").max(60),
  color: optText(60),
  // Block dimensions in cm → CBM (the industry block measure)
  lengthCm: numericFromInput.min(0).optional(),
  widthCm: numericFromInput.min(0).optional(),
  heightCm: numericFromInput.min(0).optional(),
  weightTonnes: numericFromInput.min(0).optional(),
  origin: optText(60),
  supplier: optText(80),
  costRupees: numericFromInput.min(0).optional(),
});

export const slabSchema = z.object({
  blockId: z.string().uuid(),
  bundleNo: optText(40),
  slabNo: numericFromInput.int().min(0).optional(),
  // gross slab size: length × height (in) → sq-ft
  lengthIn: numericFromInput.positive("Length must be greater than 0"),
  widthIn: numericFromInput.positive("Height must be greater than 0"),
  netSqft: numericFromInput.min(0).optional(),
  thicknessMm: numericFromInput.min(0).optional(),
  finish: optText(20),
  grade: optText(20),
  godown: optText(60),
  rateRupees: numericFromInput.min(0).optional(),
});

export type BlockInput = z.infer<typeof blockSchema>;
export type SlabInput = z.infer<typeof slabSchema>;

export const CUSTOMER_TYPES = [
  "Builder",
  "Architect",
  "Interior Designer",
  "Dealer",
  "Contractor",
  "Retail",
] as const;
export const SUPPLIER_TYPES = [
  "Quarry",
  "Block Supplier",
  "Processor",
  "Transporter",
  "Other",
] as const;

export const partySchema = z.object({
  kind: z.enum(["customer", "supplier"]),
  name: z.string().trim().min(1, "Name is required").max(100),
  partyType: optText(40),
  phone: optText(20),
  email: optText(120),
  city: optText(60),
  address: optText(200),
  gstin: optText(20),
  gstStateCode: optText(2),
  legalName: optText(120),
  creditLimitRupees: numericFromInput.min(0).optional(),
  openingBalanceRupees: numericFromInput.min(0).optional(),
  notes: optText(300),
});
export type PartyInput = z.infer<typeof partySchema>;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Description required").max(140),
  slabId: z.string().uuid().optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  hsn: z.string().trim().max(8).optional().or(z.literal("")),
  uom: z.enum(UOM_CODES as [string, ...string[]]).default(DEFAULT_UOM),
  sqft: numericFromInput.positive("Quantity must be greater than 0"),
  rateRupees: numericFromInput.min(0),
  gstRate: numericFromInput.min(0).max(28),
});

export const quoteSchema = z.object({
  customerId: z.string().uuid("Pick a customer"),
  validUntil: optText(20),
  notes: optText(300),
  items: z.array(quoteItemSchema).min(1, "Add at least one line item"),
});
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;

// Product master — a reusable named line (stone slab type or service) with
// sensible defaults the user can override on each quote.
export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120),
  hsn: z.string().trim().max(8).optional().or(z.literal("")),
  uom: z.enum(UOM_CODES as [string, ...string[]]).default(DEFAULT_UOM),
  rateRupees: numericFromInput.min(0).optional(),
  gstRate: numericFromInput.min(0).max(28).default(18),
  material: optText(60),
  finish: optText(30),
  notes: optText(200),
});
export type ProductInput = z.infer<typeof productSchema>;

// Editing an invoice replaces its line items wholesale (same shape as a quote line).
export const invoiceEditSchema = z.object({
  items: z.array(quoteItemSchema).min(1, "Add at least one line item"),
});
export type InvoiceEditInput = z.infer<typeof invoiceEditSchema>;

export const PAYMENT_MODES = ["cash", "upi", "bank", "cheque", "other"] as const;

export const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountRupees: numericFromInput.positive("Enter an amount"),
  mode: z.enum(PAYMENT_MODES),
  paidOn: optText(20),
  reference: optText(60),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const FAB_STAGES = [
  "queued",
  "cutting",
  "polishing",
  "edging",
  "qc",
  "ready",
  "dispatched",
] as const;
export const FAB_MACHINES = [
  "Gangsaw",
  "Block Cutter",
  "Polishing Line",
  "CNC",
  "Edge Polisher",
  "Manual",
] as const;

export const jobSchema = z.object({
  title: z.string().trim().min(1, "Job title required").max(120),
  material: optText(60),
  qtySqft: numericFromInput.min(0).optional(),
  machine: optText(40),
  notes: optText(300),
});
export type JobInput = z.infer<typeof jobSchema>;

export const companySettingsSchema = z.object({
  name: z.string().trim().min(2, "Company name required").max(100),
  legalName: optText(120),
  city: optText(60),
  gstNumber: optText(20),
  gstStateCode: optText(2),
  pan: optText(10),
  upiId: optText(60),
  quoteTerms: optText(300),
});

// Extra fields captured on a party for GST (derived from GSTIN, editable).
export const partyGstSchema = z.object({
  gstStateCode: optText(2),
  legalName: optText(120),
});

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: phoneSchema,
  role: z.enum(["sales_manager", "store_manager", "fabrication_supervisor"]),
});

export type CompanySetupInput = z.infer<typeof companySetupSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
