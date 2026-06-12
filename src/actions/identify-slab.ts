"use server";

import { headers } from "next/headers";
import { GoogleGenAI } from "@google/genai";
import { requireSession } from "@/lib/auth";

const MODEL = "gemini-2.5-flash";

// Same best-effort guards as visualize.ts: this is a paid Gemini call, so cap
// the upload size and rate-limit per IP even though the caller is authenticated.
const MAX_IMG_BYTES = 6 * 1024 * 1024; // ~6 MB
const RL_MAX = 8;
const RL_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export type SlabIdentity = {
  name: string; // likely commercial stone name
  type: string; // granite / marble / quartzite / etc.
  description: string; // 2-3 line catalogue blurb
  uses: string[]; // best applications
  colours: string[]; // dominant colours / veining notes
};

export type IdentifyResult = { ok: true; slab: SlabIdentity } | { error: string };

/**
 * "Snap a slab → instant listing": the owner photographs a slab and Gemini
 * names the most likely Indian commercial stone and drafts a ready-to-use
 * catalogue listing (description, best uses, colour notes). A genuinely
 * stone-specific AI tool — the differentiator of the AI Studio.
 */
export async function identifySlab(input: {
  imageBase64: string; // base64 (no data: prefix)
  mimeType: string;
}): Promise<IdentifyResult> {
  await requireSession();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Slab Identifier isn't switched on yet (missing GEMINI_API_KEY)." };
  }
  if (!input.imageBase64) return { error: "No photo provided." };

  if (Math.floor(input.imageBase64.length * 0.75) > MAX_IMG_BYTES)
    return { error: "That photo is too large — please use one under ~6 MB." };
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip))
    return { error: "Too many scans from this device — please wait a few minutes." };

  const prompt =
    "You are an expert in Indian natural stone (granite, marble, quartzite, sandstone). " +
    "Look at this photo of a polished or raw stone slab and identify the most likely commercial stone. " +
    "Prefer well-known Indian trade names where the pattern fits (e.g. Black Galaxy, Tan Brown, Steel Grey, " +
    "Kashmir White, Alaska White, Makrana Marble, Ambaji White). If unsure, give your best single guess and say so " +
    "in the description. Respond ONLY with strict JSON, no markdown, in this exact shape: " +
    `{"name": string, "type": string, "description": string, "uses": string[], "colours": string[]}. ` +
    "description must be a tasteful 2-3 line catalogue blurb a shop could send to a buyer. " +
    "uses: 3-4 short items (e.g. 'Kitchen countertops'). colours: 2-3 short colour/veining notes.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const raw = res.text?.trim() ?? "";
    if (!raw) return { error: "The model didn't return anything. Try another photo." };

    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<SlabIdentity>;

    return {
      ok: true,
      slab: {
        name: String(parsed.name || "Unidentified stone"),
        type: String(parsed.type || "Natural stone"),
        description: String(parsed.description || ""),
        uses: Array.isArray(parsed.uses) ? parsed.uses.map(String).slice(0, 4) : [],
        colours: Array.isArray(parsed.colours) ? parsed.colours.map(String).slice(0, 3) : [],
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Couldn't identify the slab: ${msg.slice(0, 160)}` };
  }
}
