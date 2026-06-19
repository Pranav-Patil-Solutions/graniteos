"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { requireEditAccess } from "@/lib/access-control-guard";
import { rupeesToPaise } from "@/lib/money";
import { getImportModule, canonicalEnum } from "@/lib/import/registry";
import {
  STONE_FINISHES,
  STONE_GRADES,
  CUSTOMER_TYPES,
  SUPPLIER_TYPES,
  FAB_MACHINES,
} from "@/lib/validation";

export type ImportFailure = { rowNo: number; reason: string };
export type ImportResult = {
  ok: boolean;
  module: string;
  total: number;
  inserted: number;
  failed: ImportFailure[];
  error?: string;
};

type IncomingRow = { rowNo: number; data: Record<string, unknown> };

/* helpers ---------------------------------------------------------------- */

function numOrNull(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function paiseOrZero(v: unknown): number {
  const n = numOrNull(v);
  return n ? rupeesToPaise(n) : 0;
}
function str(v: unknown): string | null {
  if (v === "" || v === null || v === undefined) return null;
  return String(v).trim() || null;
}

/* main ------------------------------------------------------------------- */

export async function bulkImport(
  moduleKey: string,
  rows: IncomingRow[],
): Promise<ImportResult> {
  const base: ImportResult = {
    ok: false,
    module: moduleKey,
    total: Array.isArray(rows) ? rows.length : 0,
    inserted: 0,
    failed: [],
  };

  const guard = await requireEditAccess("import");
  if ("error" in guard) return { ...base, error: guard.error };
  const me = guard.user;

  if (!can(me.role, "viewCompanySettings")) {
    return { ...base, error: "Only the owner can import data." };
  }
  const mod = getImportModule(moduleKey);
  if (!mod) return { ...base, error: "Unknown import type." };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ...base, error: "Nothing to import — the sheet had no rows." };
  }

  // 1) authoritative re-validation (never trust the client preview)
  const failed: ImportFailure[] = [];
  const valid: { rowNo: number; v: Record<string, unknown> }[] = [];
  for (const row of rows) {
    const parsed = mod.schema.safeParse(row.data ?? {});
    if (!parsed.success) {
      failed.push({ rowNo: row.rowNo, reason: parsed.error.issues[0].message });
    } else {
      valid.push({ rowNo: row.rowNo, v: parsed.data as Record<string, unknown> });
    }
  }
  if (valid.length === 0) {
    return { ...base, failed, error: "No valid rows to import." };
  }

  const supabase = await createClient();

  // 2) build DB rows per module, then batch insert
  let inserted = 0;
  let insertError: string | undefined;

  if (moduleKey === "customers" || moduleKey === "suppliers") {
    const kind = moduleKey === "customers" ? "customer" : "supplier";
    const types = moduleKey === "customers" ? CUSTOMER_TYPES : SUPPLIER_TYPES;
    const dbRows = valid.map(({ v }) => {
      const gstin = str(v.gstin);
      return {
        company_id: me.company_id,
        kind,
        name: String(v.name).trim(),
        party_type: canonicalEnum(v.partyType as string, types),
        phone: str(v.phone),
        email: str(v.email),
        city: str(v.city),
        address: str(v.address),
        gstin,
        gst_state_code: gstin ? gstin.slice(0, 2) : null,
        legal_name: str(v.legalName),
        credit_limit_paise: paiseOrZero(v.creditLimitRupees),
        opening_balance_paise: paiseOrZero(v.openingBalanceRupees),
        notes: str(v.notes),
      };
    });
    const { error } = await supabase.from("parties").insert(dbRows);
    if (error) insertError = error.message;
    else inserted = dbRows.length;
  } else if (moduleKey === "blocks") {
    const dbRows = valid.map(({ v }) => ({
      company_id: me.company_id,
      label: String(v.label).trim(),
      material: String(v.material).trim(),
      color: str(v.color),
      length_cm: numOrNull(v.lengthCm),
      width_cm: numOrNull(v.widthCm),
      height_cm: numOrNull(v.heightCm),
      weight_tonnes: numOrNull(v.weightTonnes),
      origin: str(v.origin),
      supplier: str(v.supplier),
      cost_paise: paiseOrZero(v.costRupees),
    }));
    const { error } = await supabase.from("blocks").insert(dbRows);
    if (error) insertError = error.message;
    else inserted = dbRows.length;
  } else if (moduleKey === "slabs") {
    // resolve "Block Label" -> block_id within this company
    const { data: blocks } = await supabase
      .from("blocks")
      .select("id, label")
      .eq("company_id", me.company_id);
    const byLabel = new Map<string, string>();
    for (const b of blocks ?? []) {
      byLabel.set(String(b.label).trim().toLowerCase(), b.id as string);
    }
    const dbRows: Record<string, unknown>[] = [];
    for (const { rowNo, v } of valid) {
      const blockId = byLabel.get(String(v.blockLabel).trim().toLowerCase());
      if (!blockId) {
        failed.push({
          rowNo,
          reason: `No block found with label "${String(v.blockLabel)}". Import Blocks first.`,
        });
        continue;
      }
      dbRows.push({
        company_id: me.company_id,
        block_id: blockId,
        bundle_no: str(v.bundleNo),
        slab_no: numOrNull(v.slabNo),
        length_in: numOrNull(v.lengthIn),
        width_in: numOrNull(v.widthIn),
        net_sqft: numOrNull(v.netSqft),
        thickness_mm: numOrNull(v.thicknessMm),
        finish: canonicalEnum(v.finish as string, STONE_FINISHES),
        grade: canonicalEnum(v.grade as string, STONE_GRADES),
        godown: str(v.godown),
        rate_paise: paiseOrZero(v.rateRupees),
      });
    }
    if (dbRows.length > 0) {
      const { error } = await supabase.from("slabs").insert(dbRows);
      if (error) insertError = error.message;
      else inserted = dbRows.length;
    }
  } else if (moduleKey === "jobs") {
    const dbRows: Record<string, unknown>[] = [];
    for (const { v } of valid) {
      const { data: no } = await supabase.rpc("generate_display_number", {
        p_company_id: me.company_id,
        p_entity_type: "production",
      });
      dbRows.push({
        company_id: me.company_id,
        job_no: (no as string) ?? null,
        title: String(v.title).trim(),
        material: str(v.material),
        qty_sqft: numOrNull(v.qtySqft) ?? 0,
        machine: canonicalEnum(v.machine as string, FAB_MACHINES),
        notes: str(v.notes),
      });
    }
    const { error } = await supabase.from("production_jobs").insert(dbRows);
    if (error) insertError = error.message;
    else inserted = dbRows.length;
  } else if (moduleKey === "products") {
    const dbRows = valid.map(({ v }) => {
      const gstRaw = v.gstRate;
      const gstNum =
        gstRaw === "" || gstRaw === undefined || gstRaw === null
          ? 18
          : Number(gstRaw);
      return {
        company_id: me.company_id,
        name: String(v.name).trim(),
        hsn_code: str(v.hsnCode),
        uom: str(v.uom) || "SQF",
        default_rate_paise: paiseOrZero(v.rateRupees),
        gst_rate: [0, 5, 12, 18, 28].includes(gstNum) ? gstNum : 18,
        material: str(v.material),
        finish: str(v.finish),
        notes: str(v.notes),
        active: true,
      };
    });
    const { error } = await supabase.from("products").insert(dbRows);
    if (error) insertError = error.message;
    else inserted = dbRows.length;
  } else if (moduleKey === "team") {
    // Invite each team member via the create_team_invite RPC (same as the
    // manual invite form). Rows that fail (seat limit, duplicate phone) are
    // collected as failures rather than aborting the whole batch.
    for (const { rowNo, v } of valid) {
      // Normalise the phone: strip spaces/dashes/parens, and add the +91 country
      // code for a bare 10-digit Indian mobile (the manual invite form expects an
      // E.164-style number). Anything already prefixed with + is left untouched.
      const rawPhone = String(v.phone ?? "").replace(/[\s\-()]/g, "");
      const phone = rawPhone.startsWith("+")
        ? rawPhone
        : /^\d{10}$/.test(rawPhone)
          ? `+91${rawPhone}`
          : rawPhone;
      const roleCan = ["sales_manager", "store_manager", "fabrication_supervisor"];
      const roleStr = roleCan.find(
        (r) => r.toLowerCase() === String(v.role ?? "").trim().toLowerCase(),
      );
      if (!roleStr) {
        failed.push({ rowNo, reason: `Invalid role: "${String(v.role)}"` });
        continue;
      }
      const { error: rpcErr } = await supabase.rpc("create_team_invite", {
        p_name: String(v.name).trim(),
        p_phone: phone,
        p_role: roleStr,
      });
      if (rpcErr) {
        const msg = rpcErr.message.includes("seat_limit_reached")
          ? "User limit reached — contact support to add seats."
          : rpcErr.message;
        failed.push({ rowNo, reason: msg });
      } else {
        inserted++;
      }
    }
  } else {
    return { ...base, failed, error: "This module can't be imported." };
  }

  if (insertError) {
    return { ...base, failed, error: `Database rejected the import: ${insertError}` };
  }

  // 3) refresh the affected screens
  const paths: Record<string, string> = {
    customers: "/parties",
    suppliers: "/parties",
    blocks: "/inventory",
    slabs: "/inventory",
    jobs: "/fabrication",
    products: "/products",
    team: "/team",
  };
  if (paths[moduleKey]) revalidatePath(paths[moduleKey]);

  return {
    ok: true,
    module: moduleKey,
    total: rows.length,
    inserted,
    failed,
  };
}
