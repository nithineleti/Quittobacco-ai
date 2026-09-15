"use client";

import { useActionState, useId, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { uploadPatientDocument, type UploadState } from "@/lib/auth/document-actions";
import { cn } from "@/lib/cn";
import { ACCEPT_ATTR, formatBytes, MAX_FILE_BYTES } from "@/lib/documents";

const ERRORS: Record<NonNullable<UploadState["error"]>, string> = {
  no_file: "Choose a file to send.",
  too_large: `That file is over ${formatBytes(MAX_FILE_BYTES)}. Please compress it or export a smaller version.`,
  bad_type: "Only JPEG, PNG, WebP images, PDF and Word (.docx) files can be sent.",
  no_title: "Give it a title the patient will understand.",
  bad_kind: "Choose what kind of file this is.",
  no_patient: "That patient no longer exists.",
  failed: "Could not save the file. Please try again.",
};

/**
 * The admin's "send a report" form. Progressive: it is a real <form> posting
 * to a Server Action, so it works before JavaScript loads; with it, the
 * chosen file's name and size show up and an oversized pick is refused
 * before the upload starts.
 */
export function DocumentUploadForm({
  userId,
  patientCode,
}: {
  userId: string;
  patientCode: string;
}) {
  const [state, action, pending] = useActionState(uploadPatientDocument, {});
  const [picked, setPicked] = useState<File | null>(null);
  // Remount the form after a successful send so every field clears. Adjusted
  // during render (React's documented pattern for reacting to a changed
  // prop/state) rather than in an effect; keyed on the new row's id, which is
  // unique per send — a title can legitimately repeat.
  const [formKey, setFormKey] = useState(0);
  const [lastSentId, setLastSentId] = useState<string | undefined>(undefined);
  if (state.ok && state.id !== lastSentId) {
    setLastSentId(state.id);
    setFormKey((k) => k + 1);
    setPicked(null);
  }

  const titleId = useId();
  const kindId = useId();
  const noteId = useId();
  const fileId = useId();

  const tooBig = picked !== null && picked.size > MAX_FILE_BYTES;

  return (
    <Card>
      <form key={formKey} action={action} className="flex flex-col gap-4">
        <input type="hidden" name="userId" value={userId} />

        {state.ok && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-card bg-success-soft px-4 py-3 text-sm font-medium text-success"
          >
            <Icon name="CheckCircle2" className="size-5" />
            Sent “{state.title}” to {patientCode}.
          </p>
        )}
        {state.error && (
          <p
            role="alert"
            className="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {ERRORS[state.error]}
          </p>
        )}

        <Field label="File" htmlFor={fileId} description={`JPEG, PNG, WebP, PDF or Word · up to ${formatBytes(MAX_FILE_BYTES)}`}>
          <label
            htmlFor={fileId}
            className={cn(
              "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed px-4 py-4 text-center text-sm transition-colors",
              tooBig
                ? "border-danger bg-danger-soft text-danger"
                : picked
                  ? "border-primary bg-primary-soft text-fg"
                  : "border-border bg-surface-2 text-muted hover:border-primary",
            )}
          >
            <Icon name={picked ? (tooBig ? "AlertTriangle" : "FileCheck") : "Upload"} className="size-6" />
            {picked ? (
              <>
                <span className="font-semibold">{picked.name}</span>
                <span className="text-xs">{formatBytes(picked.size)}{tooBig ? " — too large" : ""}</span>
              </>
            ) : (
              <span>Tap to choose a file</span>
            )}
          </label>
          <input
            id={fileId}
            name="file"
            type="file"
            accept={ACCEPT_ATTR}
            required
            className="sr-only"
            onChange={(e) => setPicked(e.target.files?.[0] ?? null)}
          />
        </Field>

        <Field label="Title" htmlFor={titleId} description="Shown to the patient. Say what it is in plain words.">
          <Input
            id={titleId}
            name="title"
            required
            maxLength={120}
            placeholder="e.g. Dental check-up report, 12 Sept"
          />
        </Field>

        <Field label="Kind" htmlFor={kindId}>
          <Select id={kindId} name="kind" defaultValue="report" required>
            <option value="report">Report</option>
            <option value="image">Image</option>
            <option value="document">Other document</option>
          </Select>
        </Field>

        <Field label="Note for the patient" htmlFor={noteId} description="Optional. A sentence or two they will read alongside the file.">
          <Textarea
            id={noteId}
            name="note"
            maxLength={1000}
            placeholder="e.g. Your gums are healing well. Keep brushing twice a day and we'll check again next month."
          />
        </Field>

        <Button type="submit" size="lg" full disabled={pending || tooBig}>
          <Icon name="Upload" className="size-5" />
          {pending ? "Sending…" : `Send to ${patientCode}`}
        </Button>
      </form>
    </Card>
  );
}
