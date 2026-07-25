import type { Localized } from "@/data/types";

export interface ContentCategory {
  id: string;
  label: Localized;
}

export const CONTENT_CATEGORIES: ContentCategory[] = [
  { id: "risks", label: { en: "Health risks", hi: "स्वास्थ्य जोखिम" } },
  { id: "cravings", label: { en: "Cravings", hi: "तलब" } },
  { id: "benefits", label: { en: "Benefits", hi: "फ़ायदे" } },
  { id: "oralcare", label: { en: "Oral care", hi: "मुँह की देखभाल" } },
  { id: "recovery", label: { en: "Recovery", hi: "रिकवरी" } },
];

export interface ContentItem {
  id: string;
  type: "article" | "video";
  categoryId: string;
  icon: string;
  durationMin: number;
  title: Localized;
  summary: Localized;
  /** Article body paragraphs. */
  body?: Localized[];
  /** Simulated playback length for the demo video player (seconds). */
  demoSeconds?: number;
}

export const CONTENT: ContentItem[] = [
  {
    id: "c1",
    type: "article",
    categoryId: "risks",
    icon: "AlertTriangle",
    durationMin: 4,
    title: { en: "How tobacco harms your mouth", hi: "तंबाकू आपके मुँह को कैसे नुक़सान पहुँचाता है" },
    summary: { en: "The early signs to watch for.", hi: "शुरुआती संकेत जिन पर ध्यान दें।" },
    body: [
      { en: "Chewing tobacco and gutkha sit against your gums and cheeks for a long time. That constant contact can cause white or red patches, called leukoplakia.", hi: "तंबाकू और गुटखा लंबे समय तक आपके मसूड़ों और गालों से चिपके रहते हैं। यह लगातार संपर्क सफ़ेद या लाल धब्बे बना सकता है, जिन्हें ल्यूकोप्लाकिया कहते हैं।" },
      { en: "Over years, this raises the risk of mouth cancer, gum disease, and losing teeth. It also stiffens the mouth so it opens less — a condition called oral submucous fibrosis.", hi: "वर्षों में यह मुँह के कैंसर, मसूड़ों की बीमारी और दाँत खोने का ख़तरा बढ़ाता है। मुँह भी सख़्त हो जाता है और कम खुलता है — इसे ओरल सबम्यूकस फ़ाइब्रोसिस कहते हैं।" },
      { en: "The good news: when you stop, the mouth begins to heal. Patches can shrink and your risk starts falling.", hi: "अच्छी ख़बर: जब आप छोड़ते हैं, मुँह ठीक होने लगता है। धब्बे छोटे हो सकते हैं और ख़तरा घटने लगता है।" },
    ],
  },
  {
    id: "c2",
    type: "video",
    categoryId: "risks",
    icon: "ScanLine",
    durationMin: 5,
    demoSeconds: 20,
    title: { en: "Oral cancer: early signs", hi: "मुँह का कैंसर: शुरुआती संकेत" },
    summary: { en: "What to look for, and when to see a dentist.", hi: "क्या देखें, और दंत चिकित्सक के पास कब जाएँ।" },
  },
  {
    id: "c3",
    type: "article",
    categoryId: "cravings",
    icon: "Waves",
    durationMin: 3,
    title: { en: "Beat a craving in 5 minutes", hi: "5 मिनट में तलब को हराएँ" },
    summary: { en: "Cravings peak and pass. Ride the wave.", hi: "तलब चरम पर आकर गुज़र जाती है। लहर के साथ बहें।" },
    body: [
      { en: "A craving feels huge, but it usually peaks in about 3 minutes and fades within 5. You don't have to fight it — you just have to outlast it.", hi: "तलब बहुत बड़ी लगती है, पर आम तौर पर लगभग 3 मिनट में चरम पर आती है और 5 मिनट में मिट जाती है। आपको इससे लड़ना नहीं है — बस इसे पार करना है।" },
      { en: "Remember the 4 Ds: Delay, Deep breathe, Drink water, and Do something else. Open the SOS button any time a craving hits.", hi: "4 D याद रखें: टालें, गहरी साँस लें, पानी पिएँ, और कुछ और करें। तलब उठते ही SOS बटन खोलें।" },
    ],
  },
  {
    id: "c4",
    type: "video",
    categoryId: "benefits",
    icon: "HeartPulse",
    durationMin: 4,
    demoSeconds: 20,
    title: { en: "Your body after quitting", hi: "छोड़ने के बाद आपका शरीर" },
    summary: { en: "What heals, and how fast.", hi: "क्या ठीक होता है, और कितनी जल्दी।" },
  },
  {
    id: "c5",
    type: "article",
    categoryId: "oralcare",
    icon: "Sparkles",
    durationMin: 3,
    title: { en: "Healing your gums", hi: "अपने मसूड़ों को ठीक करना" },
    summary: { en: "Simple daily habits that speed recovery.", hi: "रोज़ की आसान आदतें जो रिकवरी तेज़ करती हैं।" },
    body: [
      { en: "Brush gently twice a day and clean between your teeth. Rinse with warm salty water if your gums feel sore.", hi: "दिन में दो बार हल्के से ब्रश करें और दाँतों के बीच साफ़ करें। मसूड़ों में दर्द हो तो गुनगुने नमक-पानी से कुल्ला करें।" },
      { en: "Drink plenty of water and eat fruits and vegetables. See a dentist for a cleaning — many changes are reversible once tobacco stops.", hi: "ख़ूब पानी पिएँ और फल-सब्ज़ियाँ खाएँ। सफ़ाई के लिए दंत चिकित्सक से मिलें — तंबाकू छूटते ही कई बदलाव ठीक हो सकते हैं।" },
    ],
  },
  {
    id: "c6",
    type: "video",
    categoryId: "recovery",
    icon: "Play",
    durationMin: 6,
    demoSeconds: 20,
    title: { en: "From gutkha to free: a real story", hi: "गुटखा से आज़ादी: एक सच्ची कहानी" },
    summary: { en: "How one person quit after 15 years.", hi: "एक व्यक्ति ने 15 साल बाद कैसे छोड़ा।" },
  },
  {
    id: "c7",
    type: "article",
    categoryId: "recovery",
    icon: "CloudRain",
    durationMin: 3,
    title: { en: "Stress without tobacco", hi: "तंबाकू के बिना तनाव" },
    summary: { en: "Healthier ways to steady yourself.", hi: "ख़ुद को संभालने के बेहतर तरीक़े।" },
    body: [
      { en: "Tobacco doesn't remove stress — it just ties relief to a habit. Paced breathing, a short walk, or a call to a friend calm you without the harm.", hi: "तंबाकू तनाव नहीं हटाता — यह बस राहत को एक आदत से जोड़ देता है। नियंत्रित साँस, थोड़ी सैर, या किसी दोस्त को कॉल बिना नुक़सान के शांत करते हैं।" },
      { en: "Try the breathing tool in the SOS screen whenever pressure builds. Two minutes is often enough.", hi: "जब भी दबाव बढ़े, SOS स्क्रीन में साँस टूल आज़माएँ। अक्सर दो मिनट काफ़ी होते हैं।" },
    ],
  },
  {
    id: "c8",
    type: "video",
    categoryId: "oralcare",
    icon: "Stethoscope",
    durationMin: 3,
    demoSeconds: 20,
    title: { en: "Using nicotine gum correctly", hi: "निकोटीन गम का सही उपयोग" },
    summary: { en: "Chew slowly, then park it. Here's how.", hi: "धीरे चबाएँ, फिर टिकाएँ। ऐसे करें।" },
  },
];
