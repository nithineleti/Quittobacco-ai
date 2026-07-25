import type { Localized } from "@/data/types";

/** Craving intensity 0–4, used by the daily check-in and trigger insights. */
export interface CravingLevel {
  value: number;
  label: Localized;
  emoji: string;
}

export const CRAVING_LEVELS: CravingLevel[] = [
  { value: 0, label: { en: "None", hi: "कोई नहीं" }, emoji: "😌" },
  { value: 1, label: { en: "Mild", hi: "हल्की" }, emoji: "🙂" },
  { value: 2, label: { en: "Moderate", hi: "मध्यम" }, emoji: "😐" },
  { value: 3, label: { en: "Strong", hi: "तेज़" }, emoji: "😣" },
  { value: 4, label: { en: "Severe", hi: "बहुत तेज़" }, emoji: "😖" },
];

export interface Mood {
  id: string;
  label: Localized;
  emoji: string;
}

export const MOODS: Mood[] = [
  { id: "great", label: { en: "Great", hi: "बहुत अच्छा" }, emoji: "😄" },
  { id: "ok", label: { en: "Okay", hi: "ठीक-ठाक" }, emoji: "🙂" },
  { id: "low", label: { en: "Low", hi: "उदास" }, emoji: "😔" },
  { id: "anxious", label: { en: "Anxious", hi: "बेचैन" }, emoji: "😟" },
  { id: "irritable", label: { en: "Irritable", hi: "चिड़चिड़ा" }, emoji: "😤" },
];
