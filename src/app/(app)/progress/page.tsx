import type { Metadata } from "next";
import { ProgressScreen } from "@/components/feature/ProgressScreen";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return <ProgressScreen />;
}
