import type { Metadata } from "next";
import { ReportsScreen } from "@/components/feature/ReportsScreen";
import { getCurrentUser } from "@/lib/auth/dal";
import { listPatientDocuments } from "@/lib/auth/db";

export const metadata: Metadata = { title: "My reports" };

// Re-read on every visit: a report the clinic sent a minute ago must show up.
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  // Scoped to the signed-in user by construction — there is no way to pass a
  // different id in. The download route repeats the ownership check per file.
  const documents = await listPatientDocuments(user.id);

  return (
    <ReportsScreen
      documents={documents.map((d) => ({
        id: d.id,
        title: d.title,
        kind: d.kind,
        note: d.note,
        fileName: d.file_name,
        mime: d.mime,
        sizeBytes: d.size_bytes,
        createdAt: new Date(d.created_at).toISOString(),
        seen: d.seen_at !== null,
        sentBy: d.uploaded_by_name,
      }))}
    />
  );
}
