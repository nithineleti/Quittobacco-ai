import type { Metadata } from "next";
import { LearnScreen } from "@/components/feature/LearnScreen";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return <LearnScreen />;
}
