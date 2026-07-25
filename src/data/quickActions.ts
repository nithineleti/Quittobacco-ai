import type { Localized } from "@/data/types";

/**
 * Quick Actions shown right after a craving passes (§3.2). Image-led cards:
 * a large lucide illustration on a warm gradient block (a gradient, not a
 * photo, to respect the JS/asset budget). `accent` maps to token-backed
 * gradient classes in the component — no raw palette values.
 */
export type QuickActionAccent = "primary" | "gold" | "success" | "surface";

export interface QuickAction {
  id: string;
  label: Localized;
  sub: Localized;
  icon: string;
  href: string;
  accent: QuickActionAccent;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "breathe",
    label: { en: "Breathe", hi: "साँस लें" },
    sub: { en: "One minute of calm", hi: "एक मिनट का सुकून" },
    icon: "Wind",
    href: "/sos?tool=breathe",
    accent: "primary",
  },
  {
    id: "learn",
    label: { en: "Watch", hi: "देखें" },
    sub: { en: "A short, steadying video", hi: "एक छोटा, राहत देने वाला वीडियो" },
    icon: "PlayCircle",
    href: "/learn",
    accent: "surface",
  },
  {
    id: "log",
    label: { en: "Log the trigger", hi: "कारण दर्ज करें" },
    sub: { en: "What set it off?", hi: "किस बात से हुई?" },
    icon: "PencilLine",
    href: "/dashboard?checkin=1",
    accent: "success",
  },
  {
    id: "call",
    label: { en: "Call for help", hi: "मदद के लिए कॉल" },
    sub: { en: "You don't have to do this alone", hi: "आपको यह अकेले नहीं करना है" },
    icon: "PhoneCall",
    href: "/help",
    accent: "surface",
  },
  {
    id: "progress",
    label: { en: "See your progress", hi: "अपनी प्रगति देखें" },
    sub: { en: "Look how far you've come", hi: "देखिए आप कितनी दूर आ गए" },
    icon: "TrendingUp",
    href: "/progress",
    accent: "primary",
  },
  {
    id: "reward",
    label: { en: "Open a reward", hi: "इनाम खोलें" },
    sub: { en: "You've earned a little joy", hi: "आपने थोड़ी ख़ुशी कमाई है" },
    icon: "Gift",
    href: "/rewards",
    accent: "gold",
  },
];
