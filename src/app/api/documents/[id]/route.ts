import { isAdminUser } from "@/lib/auth/admin";
import { getOptionalUser } from "@/lib/auth/dal";
import { getPatientDocument, markDocumentSeen } from "@/lib/auth/db";

export const dynamic = "force-dynamic";

/**
 * Serves one document's bytes to exactly two kinds of caller: the patient it
 * belongs to, and an operator. Everyone else — signed out, or a different
 * patient guessing ids — gets the same 404, so the response never confirms
 * that a document exists.
 *
 * Lives under /api, which the proxy skips, so this route does its own session
 * check via the DAL (which also enforces token_version, like every page).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const notFound = () => new Response("Not found", { status: 404 });

  const user = await getOptionalUser();
  if (!user) return notFound();

  const doc = await getPatientDocument(id);
  if (!doc) return notFound();

  const isOwner = doc.user_id === user.id;
  if (!isOwner && !isAdminUser(user)) return notFound();

  // Only the PATIENT fetching it counts as "seen" — an operator previewing
  // their own upload must not clear the badge on the patient's phone. Any
  // fetch by the patient counts, including the inline preview on their
  // reports list: for an image the preview IS the content, and the list
  // lazy-loads it, so this fires when the picture has actually scrolled into
  // view. A PDF has no preview, so it stays "new" until they tap Open.
  if (isOwner && !doc.seen_at) await markDocumentSeen(id);

  // Images and PDFs render in the browser; anything else is a download. An
  // explicit ?download=1 forces the save prompt for either.
  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
  const inline =
    !wantsDownload && (doc.mime.startsWith("image/") || doc.mime === "application/pdf");

  // The stored name is already sanitised to ASCII-safe characters, and the
  // extension always matches the stored type (document-actions.ts).
  const disposition = `${inline ? "inline" : "attachment"}; filename="${doc.file_name}"`;

  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(doc.data.byteLength),
      "Content-Disposition": disposition,
      // Medical material: never let a shared cache or the browser's disk
      // cache keep a copy past this response.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
