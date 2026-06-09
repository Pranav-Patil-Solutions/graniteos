"use server";

import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash-image";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Photoreal preview isn't switched on yet (missing GEMINI_API_KEY)." };
  }
  if (!input.imageBase64) return { error: "No photo provided." };

  const prompt =
    `Edit this real photo of a room. Replace ONLY the ${input.surface} surface so it is made of ` +
    `polished ${input.material} (an Indian granite/marble). ` +
    `Keep everything else in the photo exactly the same — same layout, objects, people, ` +
    `camera angle, perspective and lighting. Match the stone's reflections and shadows to the ` +
    `existing light in the room, and keep the veining at a realistic scale for a ${input.surface}. ` +
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
