import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireModuleAccess } from "@/lib/access-control-guard";
import { createClient } from "@/lib/supabase/server";
import { parseStateFromGstin, supplyType as resolveSupplyType, DEFAULT_HSN } from "@/lib/gst";
import TaxInvoiceDoc, { type InvoiceLine } from "@/components/money/TaxInvoiceDoc";
import PrintButton from "@/components/money/PrintButton";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function TaxInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user: me } = await requireModuleAccess("money");
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select(
      "name, legal_name, address, city, gst_number, gst_state_code, pan, phone, quote_terms_text",
    )
    .eq("id", me.company_id)
    .single();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_no, invoice_date, place_of_supply, supply_type, reverse_charge, subtotal_paise, gst_paise, cgst_paise, sgst_paise, igst_paise, round_off_paise, total_paise, parties(name, legal_name, address, city, gstin, gst_state_code)",
    )
    .eq("id", id)
    .single();
  if (!invoice) notFound();

  const { data: itemData } = await supabase
    .from("invoice_items")
    .select(
      "description, hsn_code, uom, sqft, rate_paise, gst_rate, line_subtotal_paise, line_cgst_paise, line_sgst_paise, line_igst_paise, line_total_paise",
    )
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });

  const buyer = (
    invoice as unknown as {
      parties?: {
        name: string;
        legal_name: string | null;
        address: string | null;
        city: string | null;
        gstin: string | null;
        gst_state_code: string | null;
      };
    }
  ).parties;

  const sellerState =
    company?.gst_state_code || parseStateFromGstin(company?.gst_number) || null;
  const buyerState = buyer?.gst_state_code || parseStateFromGstin(buyer?.gstin) || null;
  const placeOfSupply = invoice.place_of_supply || buyerState || sellerState;
  const supplyType =
    (invoice.supply_type as "intra" | "inter" | null) ||
    (sellerState && placeOfSupply ? resolveSupplyType(sellerState, placeOfSupply) : "intra");

  let lines = (itemData ?? []) as InvoiceLine[];
  // Legacy invoices created before line-item snapshots: synthesize one line.
  if (lines.length === 0) {
    const sub = Number(invoice.subtotal_paise);
    const tax = Number(invoice.gst_paise);
    lines = [
      {
        description: "Stone supply",
        hsn_code: DEFAULT_HSN,
        uom: "SQF",
        sqft: 0,
        rate_paise: sub,
        gst_rate: sub > 0 ? Math.round((tax / sub) * 100) : 18,
        line_subtotal_paise: sub,
        line_cgst_paise: supplyType === "intra" ? Math.round(tax / 2) : 0,
        line_sgst_paise: supplyType === "intra" ? Math.round(tax / 2) : 0,
        line_igst_paise: supplyType === "inter" ? tax : 0,
        line_total_paise: sub + tax,
      },
    ];
  }

  const data = {
    seller: {
      name: company?.name ?? "—",
      legalName: company?.legal_name ?? null,
      address: company?.address ?? null,
      city: company?.city ?? null,
      gstin: company?.gst_number ?? null,
      stateCode: sellerState,
      pan: company?.pan ?? null,
      phone: company?.phone ?? null,
    },
    buyer: {
      name: buyer?.name ?? "—",
      legalName: buyer?.legal_name ?? null,
      address: buyer?.address ?? null,
      city: buyer?.city ?? null,
      gstin: buyer?.gstin ?? null,
      stateCode: buyerState,
    },
    invoiceNo: invoice.invoice_no ?? "—",
    invoiceDate: fmtDate(invoice.invoice_date),
    placeOfSupply,
    supplyType,
    reverseCharge: Boolean(invoice.reverse_charge),
    lines,
    subtotalPaise: Number(invoice.subtotal_paise),
    cgstPaise: Number(invoice.cgst_paise),
    sgstPaise: Number(invoice.sgst_paise),
    igstPaise: Number(invoice.igst_paise),
    roundOffPaise: Number(invoice.round_off_paise),
    totalPaise: Number(invoice.total_paise),
    terms: company?.quote_terms_text ?? null,
  };

  return (
    <div className="min-h-screen bg-graphite-900 px-3 py-6">
      <div className="no-print max-w-[920px] mx-auto mb-4 flex items-center justify-between">
        <Link
          href={`/invoices/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="w-4 h-4" /> Back to invoice
        </Link>
        <PrintButton />
      </div>
      <TaxInvoiceDoc data={data} />
    </div>
  );
}
