"use server";

import { headers } from "next/headers";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash-image";

// Best-effort per-IP rate limit for this UNAUTHENTICATED, paid endpoint (it runs
// on the public catalogue). In-memory: not perfect on serverless, but blocks the
// obvious abuse / denial-of-wallet. A KV/Upstash limiter is the production-grade
// upgrade.
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

// Prompt-injection guard for this public, unauthenticated endpoint. Stone names and
// surfaces are plain words (e.g. "Black Galaxy", "kitchen platform"), so we strip
// everything except letters/spaces/hyphens — this removes newlines, backticks,
// braces, "###"-style delimiters and any instruction the caller tries to smuggle in.
function cleanPromptField(s: string, max = 40): string {
  return (s || "").replace(/[^a-zA-Z\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export type VisualizeResult =
  | { ok: true; image: string } // data URL
  | { error: string };

/**
 * Photoreal "see it in your space": edits the customer's room photo so the
 * chosen surface is re-clad in the selected stone, keeping everything else
 * identical. Powered by Gemini 2.5 Flash Image. Returns a data-URL image.
 */
export async function visualizeStone(input: {
  imageBase64: string; // base64 (no data: prefix)
  mimeType: string;
  material: string;
  surface: string;
}): Promise<VisualizeResult> {
  // PAID feature gate: this image model only runs on a billed Google plan.
  // Until AI_BILLING_READY=true is set in the environment, refuse to spend.
  if (process.env.AI_BILLING_READY !== "true") {
    return { error: "Paid AI feature — not enabled yet. The owner needs to set up Google AI billing first." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Photoreal preview isn't switched on yet (missing GEMINI_API_KEY)." };
  }
  if (!input.imageBase64) return { error: "No photo provided." };

  // Sanitise free-text fields before they reach the model prompt (anti prompt-injection).
  const surface = cleanPromptField(input.surface);
  const material = cleanPromptField(input.material);
  if (!surface || !material)
    return { error: "Please choose a surface and a stone before generating a preview." };

  // Abuse guards (public, unauthenticated, paid call).
  if (Math.floor(input.imageBase64.length * 0.75) > MAX_IMG_BYTES)
    return { error: "That photo is too large — please use one under ~6 MB." };
  // NOTE: in-memory per-IP limiter is best-effort on serverless; a KV/Upstash limiter
  // is the production-grade upgrade (tracked as a HIGH item in the audit report).
  const hdrs = await headers();
  const ip =
    (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    (hdrs.get("x-real-ip") ?? "").trim() ||
    "unknown";
  if (rateLimited(ip))
    return { error: "Too many previews from this device — please wait a few minutes." };

  const prompt =
    `Edit this real photo of a room. Replace ONLY the ${surface} surface so it is made of ` +
    `polished ${material} (an Indian granite/marble). ` +
    `Keep everything else in the photo exactly the same — same layout, objects, people, ` +
    `camera angle, perspective and lighting. Match the stone's reflections and shadows to the ` +
    `existing light in the room, and keep the veining at a realistic scale for a ${surface}. ` +
    `Photorealistic result. Return only the edited image.`;

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
    });

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img?.inlineData?.data) {
      const text = parts.find((p) => p.text)?.text;
      return { error: text ? `The model declined: ${text.slice(0, 140)}` : "No image was returned. Try another photo." };
    }
    const mime = img.inlineData.mimeType || "image/png";
    return { ok: true, image: `data:${mime};base64,${img.inlineData.data}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: `Couldn't generate the preview: ${msg.slice(0, 160)}` };
  }
}
