import type { Metadata } from "next";
import { Suspense } from "react";
import { SosScreen } from "@/components/feature/SosScreen";

export const metadata: Metadata = { title: "Craving rescue" };

export default function SosPage() {
  return (
    <Suspense fallback={null}>
      <SosScreen />
    </Suspense>
  );
}
