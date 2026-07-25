import type { Metadata } from "next";
import { HelpScreen } from "@/components/feature/HelpScreen";

export const metadata: Metadata = { title: "Help & support" };

export default function HelpPage() {
  return <HelpScreen />;
}
