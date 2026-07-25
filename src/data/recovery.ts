import type { RecoveryMilestone } from "@/lib/health";
import type { Localized } from "@/data/types";

/**
 * Health-recovery timeline after quitting tobacco. Every benefit is quoted from
 * WHO's "Health benefits of smoking cessation" (verified 2026-07):
 *   https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation
 *
 * Some early milestones (carbon-monoxide, lung function) are specific to smoked
 * tobacco; the cardiovascular and cancer-risk milestones — including the drop in
 * mouth/throat cancer risk — apply to all tobacco cessation, which is why they
 * matter for smokeless (gutkha/khaini) users too.
 */
const WHO = "https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation";

export interface RecoveryMilestoneL extends RecoveryMilestone {
  whenLabel: Localized;
  benefitL: Localized;
}

export const RECOVERY_MILESTONES: RecoveryMilestoneL[] = [
  {
    day: 0,
    label: "20 minutes",
    benefit: "Your heart rate and blood pressure drop.",
    source: WHO,
    whenLabel: { en: "20 minutes", hi: "20 मिनट" },
    benefitL: { en: "Your heart rate and blood pressure drop.", hi: "आपकी हृदय गति और रक्तचाप कम हो जाते हैं।" },
  },
  {
    day: 1,
    label: "12 hours",
    benefit: "The carbon monoxide level in your blood drops to normal.",
    source: WHO,
    whenLabel: { en: "12 hours", hi: "12 घंटे" },
    benefitL: { en: "Carbon monoxide in your blood returns to normal.", hi: "रक्त में कार्बन मोनोऑक्साइड सामान्य हो जाती है।" },
  },
  {
    day: 14,
    label: "2 weeks",
    benefit: "Your circulation improves and your lung function increases.",
    source: WHO,
    whenLabel: { en: "2 weeks", hi: "2 सप्ताह" },
    benefitL: { en: "Circulation improves and lung function increases.", hi: "रक्त संचार सुधरता है और फेफड़ों की क्षमता बढ़ती है।" },
  },
  {
    day: 84,
    label: "12 weeks",
    benefit: "Circulation and lung function continue to improve (2–12 weeks).",
    source: WHO,
    whenLabel: { en: "12 weeks", hi: "12 सप्ताह" },
    benefitL: { en: "Breathing gets easier as your lungs keep recovering.", hi: "फेफड़े ठीक होते जाते हैं और साँस लेना आसान होता है।" },
  },
  {
    day: 270,
    label: "9 months",
    benefit: "Coughing and shortness of breath decrease.",
    source: WHO,
    whenLabel: { en: "9 months", hi: "9 महीने" },
    benefitL: { en: "Coughing and shortness of breath decrease.", hi: "खाँसी और साँस फूलना कम हो जाता है।" },
  },
  {
    day: 365,
    label: "1 year",
    benefit: "Your risk of coronary heart disease is about half that of a smoker's.",
    source: WHO,
    whenLabel: { en: "1 year", hi: "1 साल" },
    benefitL: { en: "Your heart-disease risk is about half that of a user's.", hi: "हृदय रोग का ख़तरा उपयोगकर्ता की तुलना में लगभग आधा।" },
  },
  {
    day: 1825,
    label: "5 years",
    benefit: "Your stroke risk reduces toward that of a non-smoker (5–15 years).",
    source: WHO,
    whenLabel: { en: "5 years", hi: "5 साल" },
    benefitL: { en: "Your stroke risk falls toward a non-user's.", hi: "स्ट्रोक का ख़तरा गैर-उपयोगकर्ता के स्तर तक घटता है।" },
  },
  {
    day: 3650,
    label: "10 years",
    benefit:
      "Your risk of cancer of the mouth, throat, oesophagus and other sites decreases, and lung-cancer risk falls to about half.",
    source: WHO,
    whenLabel: { en: "10 years", hi: "10 साल" },
    benefitL: { en: "Your risk of mouth and throat cancer keeps dropping.", hi: "मुँह और गले के कैंसर का ख़तरा घटता रहता है।" },
  },
  {
    day: 5475,
    label: "15 years",
    benefit: "Your risk of coronary heart disease is that of a non-smoker.",
    source: WHO,
    whenLabel: { en: "15 years", hi: "15 साल" },
    benefitL: { en: "Your heart-disease risk matches a non-user's.", hi: "हृदय रोग का ख़तरा गैर-उपयोगकर्ता के बराबर।" },
  },
];
