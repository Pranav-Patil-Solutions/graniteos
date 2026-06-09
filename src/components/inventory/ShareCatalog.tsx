"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share2, Check, Copy, X, MessageCircle, Download } from "lucide-react";

export default function ShareCatalog({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");

  const link =
    (typeof window !== "undefined" ? window.location.origin : "https://graniteos.vercel.app") +
    `/catalog/${companyId}`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: "#0b0e11", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [open, link]);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const waText = encodeURIComponent(`Here's our live stock catalogue:\n${link}`);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 text-gold px-3 py-2 text-sm font-bold hover:bg-gold/10"
      >
        <Share2 className="w-4 h-4" /> Share catalogue
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-graphite-600 bg-graphite-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Share your catalogue</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              A public, always-live page of your in-stock slabs. No login needed for customers.
            </p>

            {qr && (
              <div className="mt-4 grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Catalogue QR" className="w-44 h-44 rounded-xl bg-white p-1" />
                <a
                  href={qr}
                  download="graniteos-catalogue-qr.png"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-gold"
                >
                  <Download className="w-3.5 h-3.5" /> Download QR (print at your showroom)
                </a>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-graphite-600 bg-white/[0.04] px-3 py-2">
              <span className="flex-1 truncate text-xs text-slate-300">{link}</span>
              <button onClick={copy} className="text-slate-400 hover:text-gold">
                {copied ? <Check className="w-4 h-4 text-granite-green2" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[#06351a] py-2.5 font-bold"
            >
              <MessageCircle className="w-4 h-4" /> Share on WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
