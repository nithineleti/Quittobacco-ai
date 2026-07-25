import type { Localized } from "@/data/types";

export interface Trigger {
  id: string;
  label: Localized;
  /** One specific coping tactic for this trigger. */
  coping: Localized;
  /** lucide icon name. */
  icon: string;
}

export const TRIGGERS: Trigger[] = [
  {
    id: "stress",
    label: { en: "Stress", hi: "तनाव" },
    coping: { en: "Deep breathing, then a short walk.", hi: "गहरी साँस लें, फिर थोड़ी देर टहलें।" },
    icon: "CloudRain",
  },
  {
    id: "after-meals",
    label: { en: "After meals", hi: "भोजन के बाद" },
    coping: { en: "Brush your teeth or chew sugar-free gum.", hi: "दाँत ब्रश करें या शुगर-फ्री गम चबाएँ।" },
    icon: "Utensils",
  },
  {
    id: "social",
    label: { en: "Social settings", hi: "सामाजिक मौकों पर" },
    coping: { en: "Hold a water bottle; step away for a minute.", hi: "पानी की बोतल पकड़ें; एक मिनट के लिए हटें।" },
    icon: "Users",
  },
  {
    id: "boredom",
    label: { en: "Boredom", hi: "बोरियत" },
    coping: { en: "Play a quick game or call a friend.", hi: "कोई खेल खेलें या दोस्त को कॉल करें।" },
    icon: "Hourglass",
  },
  {
    id: "morning",
    label: { en: "Morning routine", hi: "सुबह की आदत" },
    coping: { en: "Brush first, then drink a glass of water.", hi: "पहले ब्रश करें, फिर एक गिलास पानी पिएँ।" },
    icon: "Sunrise",
  },
  {
    id: "tea-alcohol",
    label: { en: "With tea or alcohol", hi: "चाय या शराब के साथ" },
    coping: { en: "Sip slowly and change where you're sitting.", hi: "धीरे-धीरे पिएँ और बैठने की जगह बदलें।" },
    icon: "CupSoda",
  },
  {
    id: "work",
    label: { en: "Work pressure", hi: "काम का दबाव" },
    coping: { en: "Take a 2-minute paced-breathing break.", hi: "2 मिनट का साँस-नियंत्रण ब्रेक लें।" },
    icon: "Briefcase",
  },
  {
    id: "craving",
    label: { en: "Just a craving", hi: "बस तलब" },
    coping: { en: "Ride the wave — it peaks and passes in minutes.", hi: "लहर के साथ बहें — यह मिनटों में चरम पर आकर गुज़र जाती है।" },
    icon: "Waves",
  },
];

export function triggerById(id: string): Trigger | undefined {
  return TRIGGERS.find((t) => t.id === id);
}
