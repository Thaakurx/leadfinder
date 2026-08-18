import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// wa.me expects country code + number with no "+", spaces, or dashes.
// Relies on Google Places returning internationalized phone numbers.
// An optional prefilled `text` pre-populates WhatsApp's message box — the
// user still has to hit send themselves, WhatsApp doesn't allow auto-send
// from a web link.
export function whatsappLink(phone: string, text?: string): string {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

const PRICE_LEVEL_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
}

export function formatPriceLevel(priceLevel: string | null): string | null {
  if (!priceLevel) return null
  return PRICE_LEVEL_LABELS[priceLevel] ?? null
}
