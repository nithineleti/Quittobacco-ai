import type { Metadata } from "next";
import { Suspense } from "react";
import { SupporterScreen } from "@/components/feature/SupporterScreen";

export const metadata: Metadata = { title: "Cheer them on" };

export default function SupporterPage() {
  return (
    <Suspense fallback={null}>
      <SupporterScreen />
    </Suspense>
  );
}
