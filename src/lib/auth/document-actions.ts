"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import {
  createPatientDocument,
  deletePatientDocument as deleteRow,
  findUserById,
  getPatientDocument,
  type DocumentKind,
} from "@/lib/auth/db";
import { ACCEPTED, DOCUMENT_KINDS, hasMagic, MAX_FILE_BYTES } from "@/lib/documents";

/**
 * The only way a file enters patient_documents. Operator-only: a patient
 * cannot upload anything, to anyone, including themselves — reports flow one
 * way, from the clinic to the patient.
 */

export interface UploadState {
  ok?: boolean;
  error?:
    | "no_file"
    | "too_large"
    | "bad_type"
    | "no_title"
    | "bad_kind"
    | "no_patient"
    | "failed";
  /** Echoed so the form can show what was just sent. */
  title?: string;
  /** The new row's id — unique per success, so the form can tell one send from the next. */
  id?: string;
}

export async function uploadPatientDocument(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const kindRaw = String(formData.get("kind") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  const file = formData.get("file");

  if (!userId || !(await findUserById(userId))) return { error: "no_patient" };
  if (!title) return { error: "no_title" };
  if (!DOCUMENT_KINDS.includes(kindRaw as DocumentKind)) return { error: "bad_kind" };
  const kind = kindRaw as DocumentKind;
  if (!(file instanceof File) || file.size === 0) return { error: "no_file" };
  if (file.size > MAX_FILE_BYTES) return { error: "too_large" };
  if (!ACCEPTED[file.type]) return { error: "bad_type" };

  const data = Buffer.from(await file.arrayBuffer());
  if (data.byteLength > MAX_FILE_BYTES) return { error: "too_large" };
  if (!hasMagic(data, file.type)) return { error: "bad_type" };

  // Keep the original name for the download prompt, but never trust it for
  // the extension: a "report.exe" declared as PDF is stored as report.pdf.
  const base = (file.name || "document")
    .replace(/\.[^.]*$/, "")
    .replace(/[^\w.\-() ]+/g, "_")
    .slice(0, 80);
  const fileName = `${base || "document"}.${ACCEPTED[file.type].ext}`;

  let id: string;
  try {
    id = await createPatientDocument({
      userId,
      uploadedBy: admin.id,
      title,
      kind,
      note: note || undefined,
      fileName,
      mime: file.type,
      data,
    });
  } catch (err) {
    console.error("uploadPatientDocument failed", err);
    return { error: "failed" };
  }

  revalidatePath(`/backend/patients/${userId}`);
  revalidatePath("/backend");
  return { ok: true, title, id };
}

export async function deletePatientDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const doc = await getPatientDocument(id);
  if (!doc) return;
  await deleteRow(id);
  revalidatePath(`/backend/patients/${doc.user_id}`);
  revalidatePath("/backend");
}
