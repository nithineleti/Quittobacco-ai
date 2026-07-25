import type { Metadata } from "next";
import { ProfileScreen } from "@/components/feature/ProfileScreen";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <ProfileScreen />;
}
