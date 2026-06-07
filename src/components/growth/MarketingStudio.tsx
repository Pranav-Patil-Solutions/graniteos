"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, MessageCircle } from "lucide-react";
import { generateMarketing } from "@/actions/growth";
import { Button } from "@/components/ui/Button";

const TYPES = [
  { id: "whatsapp_offer", label: "WhatsApp offer" },
  { id: "new_arrival", label: "New arrival" },
  { id: "festival", label: "Festival greeting" },
  { id: "catalog_intro", label: "Catalogue intro" },
  { id: "product_desc", label: "Product description" },
  { id: "quote_followup", label: "Quote follow-up" },
];
const LANGUAGES = ["English", "Hinglish (Hindi + English)", "Hindi"];

export default function MarketingStudio({ materials }: { materials: string[] }) {
  const [type, setType] = useState("whatsapp_offer");
  const [language, setLanguage] = useState("Hinglish (Hindi + English)");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function onGenerate() {
    setError("");
    setLoading(true);
    setResult("");
    const res = await generateMarketing({ type, context, language });
    setLoading(false);
    if (res.error) return setError(res.error);
    setResult(res.text ?? "");
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Sparkles className="text-gold" /> Marketing Studio
      </h1>
      <p className="text-sm text-slate-400">AI writes your WhatsApp posts &amp; catalogue copy</p>

      {/* type */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 border ${
              type === t.id
                ? "bg-gold/15 text-gold border-gold/40"
                : "border-graphite-600 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="block mt-4">
        <span className="text-xs font-medium text-slate-300">Language</span>
        <select
          suppressHydrationWarning
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-1 w-full text-base focus:border-gold outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="block mt-3">
        <span className="text-xs font-medium text-slate-300">Details (optional)</span>
        <textarea
          suppressHydrationWarning
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="e.g. 10% off on Black Galaxy this week, free delivery in Hyderabad"
          className="mt-1 w-full text-base rounded-xl focus:border-gold outline-none resize-none"
          style={{ minHeight: 72, paddingTop: 10 }}
        />
      </label>
      {materials.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {materials.map((m) => (
            <button
              key={m}
              onClick={() => setContext((c) => (c ? `${c}, ${m}` : m))}
              className="text-[11px] rounded-md bg-white/[0.06] text-slate-300 px-2 py-0.5 hover:text-gold"
            >
              + {m}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}

      <Button variant="press" className="w-full mt-4" disabled={loading} onClick={onGenerate}>
        <Sparkles className="w-4 h-4" /> {loading ? "Writing..." : "Generate"}
      </Button>

      {result && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-white/[0.04] p-4">
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={6}
            className="w-full bg-transparent text-[15px] text-slate-100 outline-none resize-none border-0 !min-h-0 p-0"
            style={{ minHeight: 120 }}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={copy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-graphite-500 py-2 text-sm font-semibold text-slate-200"
            >
              {copied ? <Check className="w-4 h-4 text-granite-green2" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(result)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-[#06351a] py-2 text-sm font-bold"
            >
              <MessageCircle className="w-4 h-4" /> Share on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
