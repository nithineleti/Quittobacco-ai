import type { Localized } from "@/data/types";

/**
 * The oral-health check is a VISIBLE symptom checklist — the tracking score is
 * derived from the user's own answers (and their photo diary), not a black-box
 * "AI read your photo". That keeps the number honest and inspectable (§10).
 */
export interface ScanOption {
  value: string;
  label: Localized;
  points: number;
}

export interface ScanQuestion {
  id: string;
  label: Localized;
  options: ScanOption[];
}

export const SCAN_QUESTIONS: ScanQuestion[] = [
  {
    id: "patches",
    label: { en: "White or red patches in your mouth?", hi: "मुँह में सफ़ेद या लाल धब्बे?" },
    options: [
      { value: "none", label: { en: "None", hi: "कोई नहीं" }, points: 0 },
      { value: "one", label: { en: "One", hi: "एक" }, points: 8 },
      { value: "several", label: { en: "Several", hi: "कई" }, points: 18 },
    ],
  },
  {
    id: "pain",
    label: { en: "Mouth pain or soreness?", hi: "मुँह में दर्द या जलन?" },
    options: [
      { value: "no", label: { en: "No", hi: "नहीं" }, points: 0 },
      { value: "mild", label: { en: "Mild", hi: "हल्का" }, points: 6 },
      { value: "strong", label: { en: "Strong", hi: "तेज़" }, points: 14 },
    ],
  },
  {
    id: "bleeding",
    label: { en: "Bleeding gums when you brush?", hi: "ब्रश करते समय मसूड़ों से खून?" },
    options: [
      { value: "no", label: { en: "No", hi: "नहीं" }, points: 0 },
      { value: "sometimes", label: { en: "Sometimes", hi: "कभी-कभी" }, points: 6 },
      { value: "often", label: { en: "Often", hi: "अक्सर" }, points: 12 },
    ],
  },
  {
    id: "opening",
    label: { en: "Trouble opening your mouth wide?", hi: "मुँह पूरा खोलने में परेशानी?" },
    options: [
      { value: "no", label: { en: "No", hi: "नहीं" }, points: 0 },
      { value: "little", label: { en: "A little", hi: "थोड़ी" }, points: 8 },
      { value: "lot", label: { en: "A lot", hi: "बहुत" }, points: 16 },
    ],
  },
  {
    id: "lump",
    label: { en: "A lump or rough spot that won't heal?", hi: "कोई गांठ या खुरदुरा हिस्सा जो ठीक नहीं होता?" },
    options: [
      { value: "no", label: { en: "No", hi: "नहीं" }, points: 0 },
      { value: "yes", label: { en: "Yes", hi: "हाँ" }, points: 20 },
    ],
  },
  {
    id: "stain",
    label: { en: "Tobacco stains on your teeth?", hi: "दाँतों पर तंबाकू के दाग?" },
    options: [
      { value: "none", label: { en: "None", hi: "कोई नहीं" }, points: 0 },
      { value: "some", label: { en: "Some", hi: "कुछ" }, points: 4 },
      { value: "heavy", label: { en: "Heavy", hi: "ज़्यादा" }, points: 10 },
    ],
  },
];

const MAX_POINTS = SCAN_QUESTIONS.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.points)),
  0,
);

/** 0–100 oral-health tracking score from checklist answers. Lower = healthier. */
export function scoreScan(answers: Record<string, string>): number {
  let points = 0;
  for (const q of SCAN_QUESTIONS) {
    const chosen = q.options.find((o) => o.value === answers[q.id]);
    if (chosen) points += chosen.points;
  }
  return Math.round((points / MAX_POINTS) * 100);
}
