"use client";

import { MessageCircle } from "lucide-react";

export default function ShareWhatsApp({
  phone,
  message,
  label = "Send on WhatsApp",
}: {
  phone: string | null;
  message: string;
  label?: string;
}) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-[#06351a] py-2.5 text-sm font-bold"
    >
      <MessageCircle className="w-4 h-4" /> {label}
    </a>
  );
}
