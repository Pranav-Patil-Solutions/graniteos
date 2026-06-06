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
});

const numericFromInput = z.coerce.number();

export const blockSchema = z.object({
  label: z.string().trim().min(1, "Give the block a name").max(80),
  material: z.string().trim().min(1, "Material is required").max(60),
  weightTonnes: numericFromInput.positive("Weight must be greater than 0"),
  supplier: z.string().trim().max(80).optional().or(z.literal("")),
  costRupees: numericFromInput.min(0).optional(),
});

export const slabSchema = z.object({
  blockId: z.string().uuid(),
  lengthIn: numericFromInput.positive("Length must be greater than 0"),
  widthIn: numericFromInput.positive("Width must be greater than 0"),
  thicknessMm: numericFromInput.min(0).optional(),
  godown: z.string().trim().max(60).optional().or(z.literal("")),
  rateRupees: numericFromInput.min(0).optional(),
});

export type BlockInput = z.infer<typeof blockSchema>;
export type SlabInput = z.infer<typeof slabSchema>;

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: phoneSchema,
  role: z.enum(["sales_manager", "store_manager", "fabrication_supervisor"]),
});

export type CompanySetupInput = z.infer<typeof companySetupSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
