/**
 * The single source of truth mapping oral-health risk levels to design tokens.
 * Everything that renders a risk (scan results, admin flags) imports from here —
 * no component re-implements the colour mapping inline.
 */
export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface RiskTone {
  level: RiskLevel;
  label: string;
  /** Tailwind text-colour class (token-backed). */
  text: string;
  /** Tailwind soft background class (token-backed). */
  softBg: string;
  /** Tailwind solid dot/indicator class (token-backed). */
  dot: string;
}

const MAP: Record<RiskLevel, Omit<RiskTone, "level">> = {
  low: { label: "Low", text: "text-success", softBg: "bg-success-soft", dot: "bg-success" },
  moderate: { label: "Moderate", text: "text-warning", softBg: "bg-warning-soft", dot: "bg-warning" },
  high: { label: "High", text: "text-alert", softBg: "bg-alert-soft", dot: "bg-alert" },
  critical: { label: "Critical", text: "text-danger", softBg: "bg-danger-soft", dot: "bg-danger" },
};

export function riskTone(level: RiskLevel): RiskTone {
  return { level, ...MAP[level] };
}

/** Map a 0–100 score to a risk level. Lower is healthier. */
export function scoreToRisk(score: number): RiskLevel {
  if (score <= 24) return "low";
  if (score <= 49) return "moderate";
  if (score <= 74) return "high";
  return "critical";
}
