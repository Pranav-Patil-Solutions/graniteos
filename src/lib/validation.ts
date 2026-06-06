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

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: phoneSchema,
  role: z.enum(["sales_manager", "store_manager", "fabrication_supervisor"]),
});

export type CompanySetupInput = z.infer<typeof companySetupSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
