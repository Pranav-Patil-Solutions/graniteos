"use server";

import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { requireSession } from "@/lib/auth";

const PROMPTS: Record<string, string> = {
  whatsapp_offer:
    "Write a short, punchy WhatsApp marketing broadcast announcing a special offer/discount on the granite or marble mentioned. Friendly, a couple of emojis, a clear call-to-action to visit or reply.",
  new_arrival:
    "Write a WhatsApp message announcing a fresh new stock arrival of the stone mentioned. Build excitement, invite the customer to come see the slabs.",
  festival:
    "Write a warm festival greeting from a granite/marble business to its customers, with a soft, tasteful promotional line. Use the festival named in the details, or a generic auspicious greeting if none.",
  catalog_intro:
    "Write a short, premium 2-3 line introduction for the business's stock catalogue that can sit at the top when sharing slab photos with a buyer.",
  product_desc:
    "Write a compelling 2-3 sentence product description for the stone mentioned — its look, best uses (kitchen, flooring, facade), and appeal. No pricing.",
  quote_followup:
    "Write a polite, professional WhatsApp follow-up message to a customer a few days after a quotation was sent, gently nudging them to confirm, and offering to answer questions.",
};

export async function generateMarketing(input: {
  type: string;
  context: string;
  language: string;
}) {
  await requireSession();

  if (!process.env.GROQ_API_KEY) {
    return { error: "AI isn't connected yet — add your free Groq key to switch this on." };
  }
  const base = PROMPTS[input.type];
  if (!base) return { error: "Unknown content type." };

  try {
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: `You are a marketing copywriter for an Indian granite & marble (natural stone) business. Write in ${input.language}. Keep it concise and WhatsApp-ready with tasteful emojis. Do not use markdown headings or asterisks. Output only the message text.`,
      prompt: `${base}\n\nDetails from the shop owner: ${input.context || "(no extra details given — keep it general)"}`,
    });
    return { ok: true as const, text: text.trim() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed." };
  }
}
