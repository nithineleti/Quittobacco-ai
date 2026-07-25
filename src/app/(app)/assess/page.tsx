import type { Metadata } from "next";
import { AssessScreen } from "@/components/feature/AssessScreen";

export const metadata: Metadata = { title: "Oral check" };

export default function AssessPage() {
  return <AssessScreen />;
}
