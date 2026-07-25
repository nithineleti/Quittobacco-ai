import type { Localized } from "@/data/types";

/** Default urge-surfing countdown. Cravings peak and pass in ~3–5 minutes. */
export const URGE_SURF_SECONDS = 180;

/** 4-7-8 paced breathing (inhale / hold / exhale seconds). */
export const BREATHING = { inhale: 4, hold: 7, exhale: 8, cycles: 4 } as const;

export const RESCUE_MESSAGES: Localized[] = [
  { en: "This craving will pass in 3–5 minutes. Stay with it.", hi: "यह तलब 3–5 मिनट में गुज़र जाएगी। बस टिके रहें।" },
  { en: "You have already survived 100% of your hardest days.", hi: "आप अपने सबसे कठिन दिनों में से 100% को पार कर चुके हैं।" },
  { en: "Ride the wave. Don't fight it — let it pass through you.", hi: "लहर के साथ बहें। लड़ें नहीं — इसे गुज़र जाने दें।" },
  { en: "Think about why you started this journey.", hi: "याद करें कि आपने यह सफ़र क्यों शुरू किया।" },
  { en: "The peak lasts only about 3 minutes. You can do this.", hi: "चरम केवल लगभग 3 मिनट रहता है। आप यह कर सकते हैं।" },
];

/** The 4 Ds — a classic craving toolkit. */
export const FOUR_DS: { title: Localized; icon: string }[] = [
  { title: { en: "Delay", hi: "टालें" }, icon: "Clock" },
  { title: { en: "Deep breathe", hi: "गहरी साँस" }, icon: "Wind" },
  { title: { en: "Drink water", hi: "पानी पिएँ" }, icon: "Droplets" },
  { title: { en: "Do something", hi: "कुछ और करें" }, icon: "Footprints" },
];

export const AFFIRMATIONS: Localized[] = [
  { en: "I am stronger than my cravings.", hi: "मैं अपनी तलब से ज़्यादा मज़बूत हूँ।" },
  { en: "Every tobacco-free day is a victory.", hi: "हर तंबाकू-मुक्त दिन एक जीत है।" },
  { en: "My body is healing and recovering.", hi: "मेरा शरीर ठीक हो रहा है।" },
  { en: "I choose health over habit.", hi: "मैं आदत से ऊपर सेहत चुनता/चुनती हूँ।" },
];
