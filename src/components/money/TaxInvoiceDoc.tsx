import { formatINRPrecise } from "@/lib/money";
import { stateLabel, amountInWords, DEFAULT_HSN } from "@/lib/gst";

export type InvoiceLine = {
  description: string;
  hsn_code: string | null;
  sqft: number;
  rate_paise: number;
  gst_rate: number;
  line_subtotal_paise: number;
  line_cgst_paise: number;
  line_sgst_paise: number;
  line_igst_paise: number;
  line_total_paise: number;
};

export type TaxInvoiceData = {
  seller: {
    name: string;
    legalName: string | null;
    address: string | null;
    city: string | null;
    gstin: string | null;
    stateCode: string | null;
    pan: string | null;
    phone: string | null;
  };
  buyer: {
    name: string;
    legalName: string | null;
    address: string | null;
    city: string | null;
    gstin: string | null;
    stateCode: string | null;
  };
  invoiceNo: string;
  invoiceDate: string;
  placeOfSupply: string | null;
  supplyType: "intra" | "inter";
  reverseCharge: boolean;
  lines: InvoiceLine[];
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundOffPaise: number;
  totalPaise: number;
  terms: string | null;
};

const inr = (p: number) => formatINRPrecise(p);

export default function TaxInvoiceDoc({ data }: { data: TaxInvoiceData }) {
  const intra = data.supplyType === "intra";

  // HSN summary
  const hsnGroups = new Map<
    string,
    { taxable: number; cgst: number; sgst: number; igst: number }
  >();
  for (const ln of data.lines) {
    const key = ln.hsn_code || DEFAULT_HSN;
    const g = hsnGroups.get(key) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    g.taxable += Number(ln.line_subtotal_paise);
    g.cgst += Number(ln.line_cgst_paise);
    g.sgst += Number(ln.line_sgst_paise);
    g.igst += Number(ln.line_igst_paise);
    hsnGroups.set(key, g);
  }
  const taxTotal = data.cgstPaise + data.sgstPaise + data.igstPaise;

  return (
    <div id="invoice-print" className="invoice-paper">
      <style>{printCss}</style>

      <div className="title">TAX INVOICE</div>

      <div className="head">
        <div className="seller">
          <div className="nm">{data.seller.name}</div>
          <div className="small">
            {data.seller.legalName && <>({data.seller.legalName})<br /></>}
            {data.seller.address && <>{data.seller.address}<br /></>}
            {data.seller.city}
            <br />
            <b>GSTIN:</b> {data.seller.gstin ?? "—"} &nbsp; <b>State:</b>{" "}
            {stateLabel(data.seller.stateCode)}
            <br />
            {data.seller.pan && (
              <>
                <b>PAN:</b> {data.seller.pan} &nbsp;
              </>
            )}
            {data.seller.phone && <>Ph: {data.seller.phone}</>}
          </div>
        </div>
        <div className="meta">
          <div>
            <b>Invoice No:</b> {data.invoiceNo}
          </div>
          <div>
            <b>Date:</b> {data.invoiceDate}
          </div>
          <div>
            <b>Place of supply:</b> {stateLabel(data.placeOfSupply)}
          </div>
          <div>
            <b>Reverse charge:</b> {data.reverseCharge ? "Yes" : "No"}
          </div>
        </div>
      </div>

      <div className="parties">
        <div className="box">
          <div className="lbl">Bill to</div>
          <div className="small">
            <b>{data.buyer.legalName || data.buyer.name}</b>
            <br />
            {data.buyer.address && <>{data.buyer.address}<br /></>}
            {data.buyer.city}
            <br />
            <b>GSTIN:</b> {data.buyer.gstin ?? "Unregistered"}
            <br />
            <b>State:</b> {stateLabel(data.buyer.stateCode)}
          </div>
        </div>
        <div className="box">
          <div className="lbl">Ship to</div>
          <div className="small">Same as billing address.</div>
        </div>
      </div>

      <table className="lines">
        <thead>
          <tr>
            <th className="l">#</th>
            <th className="l">Description</th>
            <th>HSN/SAC</th>
            <th>Qty (sqft)</th>
            <th>Rate ₹</th>
            <th>Taxable ₹</th>
            {intra ? (
              <>
                <th colSpan={2}>CGST</th>
                <th colSpan={2}>SGST</th>
              </>
            ) : (
              <th colSpan={2}>IGST</th>
            )}
            <th>Total ₹</th>
          </tr>
          <tr className="sub">
            <th className="l"></th>
            <th className="l"></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            {intra ? (
              <>
                <th>%</th>
                <th>Amt</th>
                <th>%</th>
                <th>Amt</th>
              </>
            ) : (
              <>
                <th>%</th>
                <th>Amt</th>
              </>
            )}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((ln, i) => (
            <tr key={i}>
              <td className="l">{i + 1}</td>
              <td className="l">{ln.description}</td>
              <td>{ln.hsn_code || DEFAULT_HSN}</td>
              <td>{ln.sqft ? Number(ln.sqft).toFixed(2) : "—"}</td>
              <td>{inr(ln.rate_paise)}</td>
              <td>{inr(ln.line_subtotal_paise)}</td>
              {intra ? (
                <>
                  <td>{ln.gst_rate / 2}%</td>
                  <td>{inr(ln.line_cgst_paise)}</td>
                  <td>{ln.gst_rate / 2}%</td>
                  <td>{inr(ln.line_sgst_paise)}</td>
                </>
              ) : (
                <>
                  <td>{ln.gst_rate}%</td>
                  <td>{inr(ln.line_igst_paise)}</td>
                </>
              )}
              <td>{inr(ln.line_total_paise)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="l" colSpan={6}>
              Total
            </td>
            {intra ? (
              <>
                <td>—</td>
                <td>{inr(data.cgstPaise)}</td>
                <td>—</td>
                <td>{inr(data.sgstPaise)}</td>
              </>
            ) : (
              <>
                <td>—</td>
                <td>{inr(data.igstPaise)}</td>
              </>
            )}
            <td>{inr(data.subtotalPaise + taxTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <table className="hsn">
        <thead>
          <tr>
            <th className="l">HSN/SAC summary</th>
            <th>Taxable ₹</th>
            {intra ? (
              <>
                <th>CGST ₹</th>
                <th>SGST ₹</th>
              </>
            ) : (
              <th>IGST ₹</th>
            )}
            <th>Tax ₹</th>
          </tr>
        </thead>
        <tbody>
          {[...hsnGroups.entries()].map(([hsn, g]) => (
            <tr key={hsn}>
              <td className="l">{hsn}</td>
              <td>{inr(g.taxable)}</td>
              {intra ? (
                <>
                  <td>{inr(g.cgst)}</td>
                  <td>{inr(g.sgst)}</td>
                </>
              ) : (
                <td>{inr(g.igst)}</td>
              )}
              <td>{inr(g.cgst + g.sgst + g.igst)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totbox">
        <div className="words">
          <div className="lbl">Amount in words</div>
          <div>{amountInWords(data.totalPaise)}</div>
          {data.terms && (
            <>
              <div className="lbl" style={{ marginTop: 10 }}>
                Terms
              </div>
              <div>{data.terms}</div>
            </>
          )}
        </div>
        <div className="sums">
          <div>
            <span>Taxable value</span>
            <span>{inr(data.subtotalPaise)}</span>
          </div>
          {intra ? (
            <>
              <div>
                <span>CGST</span>
                <span>{inr(data.cgstPaise)}</span>
              </div>
              <div>
                <span>SGST</span>
                <span>{inr(data.sgstPaise)}</span>
              </div>
            </>
          ) : (
            <div>
              <span>IGST</span>
              <span>{inr(data.igstPaise)}</span>
            </div>
          )}
          <div>
            <span>Round off</span>
            <span>
              {data.roundOffPaise >= 0 ? "+" : "−"}
              {inr(Math.abs(data.roundOffPaise))}
            </span>
          </div>
          <div className="grand">
            <span>Grand total</span>
            <span>{inr(data.totalPaise)}</span>
          </div>
        </div>
      </div>

      <div className="sign">
        For <b>{data.seller.legalName || data.seller.name}</b>
        <div className="sp" />
        Authorised Signatory
      </div>
      <div className="foot">
        Certified that the particulars given above are true and correct. This is a
        computer-generated tax invoice.
      </div>
    </div>
  );
}

const printCss = `
.invoice-paper{background:#fff;color:#0f1115;border-radius:10px;padding:30px 30px 26px;
  max-width:920px;margin:0 auto;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial;
  box-shadow:0 20px 60px rgba(0,0,0,.45)}
.invoice-paper .title{text-align:center;font-weight:800;letter-spacing:3px;font-size:15px;
  border:2px solid #0f1115;border-radius:6px;padding:6px;margin-bottom:18px}
.invoice-paper .head{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
.invoice-paper .seller .nm{font-weight:800;font-size:16px}
.invoice-paper .small{font-size:12px;color:#444;line-height:1.5}
.invoice-paper .meta{font-size:12px;text-align:right;min-width:210px}
.invoice-paper .meta div{margin-bottom:2px}
.invoice-paper .meta b,.invoice-paper .small b{color:#000}
.invoice-paper .parties{display:flex;gap:14px;margin:16px 0;flex-wrap:wrap}
.invoice-paper .box{flex:1;min-width:240px;border:1px solid #d6d6d6;border-radius:8px;padding:12px}
.invoice-paper .box .lbl{font-size:10px;letter-spacing:1px;color:#777;text-transform:uppercase;margin-bottom:5px}
.invoice-paper table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:4px}
.invoice-paper th,.invoice-paper td{border:1px solid #d9d9d9;padding:7px 8px;text-align:right}
.invoice-paper th{background:#f2f4f7;font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;color:#333}
.invoice-paper td.l,.invoice-paper th.l{text-align:left}
.invoice-paper tfoot td{font-weight:700}
.invoice-paper .hsn{margin-top:16px}
.invoice-paper .totbox{margin-top:14px;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
.invoice-paper .words{flex:1;min-width:240px;font-size:12px;color:#222}
.invoice-paper .words .lbl{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:1px}
.invoice-paper .sums{min-width:260px;font-size:12.5px}
.invoice-paper .sums>div{display:flex;justify-content:space-between;padding:3px 0}
.invoice-paper .sums .grand{border-top:2px solid #000;margin-top:4px;padding-top:6px;font-weight:800;font-size:14px}
.invoice-paper .sign{margin-top:26px;text-align:right;font-size:12px}
.invoice-paper .sign .sp{height:46px}
.invoice-paper .foot{font-size:10.5px;color:#666;margin-top:14px;border-top:1px solid #eee;padding-top:8px}
@media print{
  body *{visibility:hidden}
  #invoice-print,#invoice-print *{visibility:visible}
  #invoice-print{position:absolute;left:0;top:0;width:100%;box-shadow:none;border-radius:0}
  .no-print{display:none !important}
}
`;
