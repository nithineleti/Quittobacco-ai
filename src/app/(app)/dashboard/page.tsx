import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardScreen } from "@/components/feature/DashboardScreen";

export const metadata: Metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardScreen />
    </Suspense>
  );
}
