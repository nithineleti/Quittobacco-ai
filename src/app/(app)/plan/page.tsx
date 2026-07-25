import type { Metadata } from "next";
import { PlanScreen } from "@/components/feature/PlanScreen";

export const metadata: Metadata = { title: "Your plan" };

export default function PlanPage() {
  return <PlanScreen />;
}
