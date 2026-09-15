import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Stat, when } from "@/components/feature/BackendDashboard";
import { DeleteDocumentButton } from "@/components/feature/DeleteDocumentButton";
import { DocumentUploadForm } from "@/components/feature/DocumentUploadForm";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { IconTile, type TileHue } from "@/components/ui/IconTile";
import { Pill } from "@/components/ui/Pill";
import { summarizeJourney } from "@/lib/adminSummary";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminUser, listPatientDocuments, type DocumentKind } from "@/lib/auth/db";
import { formatBytes } from "@/lib/documents";
import { formatPatientCode } from "@/lib/patient";

export const metadata: Metadata = {
  title: "Patient",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const KIND_TILE: Record<DocumentKind, { icon: string; hue: TileHue; label: string }> = {
  report: { icon: "FileText", hue: "sky", label: "Report" },
  image: { icon: "FileImage", hue: "pink", label: "Image" },
  document: { icon: "Paperclip", hue: "violet", label: "Document" },
};

const dtfExact = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * One patient: who they are, how their journey is going, and the reports the
 * clinic has sent them — with the form that sends another. This page is the
 * ONLY place a file can be attached to a patient.
 */
export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const patient = await getAdminUser(id);
  if (!patient) notFound();
  const documents = await listPatientDocuments(id);
  const j = summarizeJourney(patient.state);
  const code = formatPatientCode(patient.patient_no);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8">
      <Link
        href="/backend"
        className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-semibold text-muted hover:text-fg"
      >
        <Icon name="ChevronLeft" className="size-4" />
        All patients
      </Link>

      <header className="flex flex-wrap items-start gap-5">
        <IconTile icon="IdCard" hue="violet" size="xl" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-3xl font-bold tracking-wider text-primary">{code}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-fg">
            {patient.display_name ?? "Unnamed patient"}
          </h1>
          <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex gap-2"><dt className="text-muted">E-mail</dt><dd className="text-fg">{patient.email}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Phone</dt><dd className="text-fg">{patient.phone ?? "—"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Language</dt><dd className="uppercase text-fg">{patient.language}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Joined</dt><dd className="text-fg">{when(patient.created_at)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Last login</dt><dd className="text-fg">{when(patient.last_login_at)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Journey synced</dt><dd className="text-fg">{when(patient.synced_at)}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Quit date</dt><dd className="text-fg">{j.quitDate ?? "—"}</dd></div>
          </dl>
        </div>
        {patient.is_admin && <Pill tone="neutral">admin</Pill>}
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Days since quit" value={j.daysSinceQuit ?? "—"} />
        <Stat label="Active days" value={j.activeDays} hint="opened the app" />
        <Stat label="Check-ins" value={j.checkIns} />
        <Stat label="Slips" value={j.slips} hint={j.lastSlip ? `last ${j.lastSlip}` : undefined} />
        <Stat label="Rewards" value={j.rewardsClaimed} hint="claimed" />
        <Stat label="Videos" value={j.videosCompleted} hint="completed" />
        <Stat label="FTND" value={j.dependence ?? "—"} hint="dependence 0–10" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-bold text-fg">Send to this patient</h2>
            <p className="text-sm text-muted">
              A report, an image or a document. It appears in the app under
              “My reports” the next time they open it, marked as new.
            </p>
          </div>
          <DocumentUploadForm userId={patient.id} patientCode={code} />
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-bold text-fg">
              Sent so far{" "}
              <span className="text-base font-semibold text-muted">({documents.length})</span>
            </h2>
            <p className="text-sm text-muted">
              “Opened” means the patient has viewed it in the app.
            </p>
          </div>
          {documents.length === 0 ? (
            <Card className="py-10 text-center text-sm text-muted">
              Nothing sent to this patient yet.
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {documents.map((d) => {
                const tile = KIND_TILE[d.kind] ?? KIND_TILE.document;
                const href = `/api/documents/${d.id}`;
                const isImage = d.mime.startsWith("image/");
                return (
                  <li key={d.id}>
                    <Card padded={false} className="flex gap-4 p-4">
                      {isImage ? (
                        <a href={href} target="_blank" rel="noreferrer" className="shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={href}
                            alt={d.title}
                            className="size-20 rounded-tile object-cover"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <IconTile icon={tile.icon} hue={tile.hue} size="lg" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-bold text-fg">{d.title}</p>
                          <Pill tone={d.seen_at ? "success" : "neutral"}>
                            {d.seen_at ? "Opened" : "Not opened yet"}
                          </Pill>
                        </div>
                        <p className="text-sm text-muted">
                          {tile.label} · {d.file_name} · {formatBytes(d.size_bytes)}
                        </p>
                        <p className="text-xs text-muted">
                          Sent {dtfExact.format(new Date(d.created_at))}
                          {d.uploaded_by_name ? ` by ${d.uploaded_by_name}` : ""}
                          {d.seen_at ? ` · opened ${dtfExact.format(new Date(d.seen_at))}` : ""}
                        </p>
                        {d.note && <p className="mt-2 text-sm text-fg">{d.note}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-1 rounded-pill bg-primary-soft px-3 text-xs font-semibold text-primary hover:opacity-90"
                          >
                            <Icon name="Eye" className="size-3.5" />
                            Open
                          </a>
                          <DeleteDocumentButton id={d.id} title={d.title} />
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
