"use client";

import { Icon } from "@/components/Icon";
import { deletePatientDocument } from "@/lib/auth/document-actions";

/** Removes one document for good. A plain form so it works without JavaScript; with it, asks first. */
export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deletePatientDocument}
      onSubmit={(e) => {
        if (!confirm(`Delete “${title}”? The patient will no longer see it. This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex min-h-9 items-center gap-1 rounded-pill px-3 text-xs font-semibold text-danger hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="Trash2" className="size-3.5" />
        Delete
      </button>
    </form>
  );
}
