/**
 * Facts about patient documents that BOTH sides need: the admin upload form
 * (client) to pre-filter the file picker and explain limits, and the Server
 * Action to enforce them. Kept out of document-actions.ts because a
 * "use server" module may only export async functions.
 */
import type { DocumentKind } from "@/lib/auth/db";

/** Per file. Under Vercel's 4.5 MB function body limit with multipart headroom. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/**
 * Accepted types, each with the byte signature a genuine file of that type
 * starts with. The browser-reported MIME is just a claim — a renamed .html
 * arrives as "image/png" if the uploader says so — and the download route
 * serves whatever type is stored, inline. Checking the magic bytes is what
 * makes "only these types" actually true. SVG is absent on purpose: it is an
 * XML document that can carry script.
 */
export const ACCEPTED: Record<string, { magic: number[][]; ext: string }> = {
  "image/jpeg": { magic: [[0xff, 0xd8, 0xff]], ext: "jpg" },
  "image/png": { magic: [[0x89, 0x50, 0x4e, 0x47]], ext: "png" },
  "image/webp": { magic: [[0x52, 0x49, 0x46, 0x46]], ext: "webp" },
  "application/pdf": { magic: [[0x25, 0x50, 0x44, 0x46]], ext: "pdf" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    magic: [[0x50, 0x4b, 0x03, 0x04]],
    ext: "docx",
  },
};

/** For <input accept>. */
export const ACCEPT_ATTR = Object.keys(ACCEPTED).join(",");

export const DOCUMENT_KINDS: DocumentKind[] = ["report", "image", "document"];

export function hasMagic(bytes: Uint8Array, mime: string): boolean {
  const sigs = ACCEPTED[mime]?.magic ?? [];
  return sigs.some((sig) => sig.every((b, i) => bytes[i] === b));
}

/** "1.2 MB" / "340 KB" for lists. */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
