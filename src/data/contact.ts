import type { Localized } from "@/data/types";

/**
 * PLACEHOLDERS — replace with the real support channels (§12 Q1).
 * Centralised here so swapping in the real values is a one-line change.
 */
export const SUPPORT_EMAIL = "support@quittobacco.example";
export const SUPPORT_PHONE_DISPLAY = "+91 00000 00000";
export const SUPPORT_PHONE_TEL = "+910000000000";

/**
 * India National Tobacco Quitline — MoHFW National Tobacco Quit Line Services
 * (NTQLS), run from VPCI New Delhi with regional centres. Toll-free.
 * Verified 2026-07 against the official NTCP page:
 *   https://ntcp.mohfw.gov.in/national_tobacco_quit_line_services
 * (WHO writes the same digits as "1800-11-2356":
 *   https://www.who.int/india/news/item/08-10-2021-tobacco-kills-dial-1800-11-2356-to-quit!)
 */
export const QUITLINE = {
  numberDisplay: "1800-112-356",
  tel: "1800112356",
  name: {
    en: "National Tobacco Quitline (toll-free)",
    hi: "राष्ट्रीय तंबाकू क्विटलाइन (टोल-फ्री)",
  } satisfies Localized,
  note: {
    en: "Free counselling from trained counsellors, in many Indian languages.",
    hi: "प्रशिक्षित काउंसलर से मुफ़्त सलाह, कई भारतीय भाषाओं में।",
  } satisfies Localized,
};
