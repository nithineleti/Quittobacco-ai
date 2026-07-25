export type Language = "en" | "hi";

/** A string available in every supported language. */
export type Localized = Record<Language, string>;

export function loc(l: Localized, lang: Language): string {
  return l[lang] ?? l.en;
}
