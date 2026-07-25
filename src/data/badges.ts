import type { BadgeTier } from "@/lib/scoring";
import type { Localized } from "@/data/types";

export interface BadgeMeta {
  tier: BadgeTier;
  name: Localized;
  blurb: Localized;
  /** lucide icon name. */
  icon: string;
  /** Metallic medallion classes (token-backed) — distinct per tier. */
  fill: string;
  fg: string;
  ring: string;
}

/** Each tier has its own metal, so leveling up genuinely looks different. */
export const BADGE_META: Record<BadgeTier, BadgeMeta> = {
  bronze: {
    tier: "bronze",
    name: { en: "Bronze", hi: "कांस्य" },
    blurb: { en: "You've started. This is the hardest step.", hi: "आपने शुरुआत कर दी — यही सबसे कठिन कदम है।" },
    icon: "Medal",
    fill: "bg-tier-bronze",
    fg: "text-tier-bronze-fg",
    ring: "ring-tier-bronze",
  },
  silver: {
    tier: "silver",
    name: { en: "Silver", hi: "रजत" },
    blurb: { en: "A week strong and learning as you go.", hi: "एक सप्ताह मज़बूत और सीखते हुए आगे।" },
    icon: "Award",
    fill: "bg-tier-silver",
    fg: "text-tier-silver-fg",
    ring: "ring-tier-silver",
  },
  gold: {
    tier: "gold",
    name: { en: "Gold", hi: "स्वर्ण" },
    blurb: { en: "A month free — your body is healing.", hi: "एक महीना मुक्त — आपका शरीर ठीक हो रहा है।" },
    icon: "Crown",
    fill: "bg-tier-gold",
    fg: "text-tier-gold-fg",
    ring: "ring-tier-gold",
  },
  platinum: {
    tier: "platinum",
    name: { en: "Platinum", hi: "प्लैटिनम" },
    blurb: { en: "Half a year of freedom. Remarkable.", hi: "आधे साल की आज़ादी। शानदार।" },
    icon: "Gem",
    fill: "bg-tier-platinum",
    fg: "text-tier-platinum-fg",
    ring: "ring-tier-platinum",
  },
  diamond: {
    tier: "diamond",
    name: { en: "Diamond", hi: "हीरा" },
    blurb: { en: "A full year tobacco-free. An inspiration.", hi: "पूरा एक साल तंबाकू-मुक्त। एक प्रेरणा।" },
    icon: "Sparkles",
    fill: "bg-tier-diamond",
    fg: "text-tier-diamond-fg",
    ring: "ring-tier-diamond",
  },
};
