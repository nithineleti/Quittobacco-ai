import type { Metadata } from "next";
import { ProfileScreen } from "@/components/feature/ProfileScreen";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatPatientCode } from "@/lib/patient";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  return (
    <ProfileScreen
      patientCode={formatPatientCode(user.patient_no)}
      // Operators get a link to the admin panel. Everyone else never sees that
      // it exists — the route itself 404s for them either way.
      isAdmin={isAdminUser(user)}
    />
  );
}
