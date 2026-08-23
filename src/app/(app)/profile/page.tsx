import type { Metadata } from "next";
import { ProfileScreen } from "@/components/feature/ProfileScreen";
import { viewerIsAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  // Operators get a link to the backend dashboard. Everyone else never sees
  // that it exists — the route itself 404s for them either way.
  const isAdmin = await viewerIsAdmin();
  return <ProfileScreen isAdmin={isAdmin} />;
}
