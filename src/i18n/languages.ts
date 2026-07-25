/**
 * Single source of truth for supported languages. Adding a language is a data
 * change, not a code change: drop in `xx.json`, add one row here (and its two
 * lines in resources.ts), and the picker + i18n pick it up.
 */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];
