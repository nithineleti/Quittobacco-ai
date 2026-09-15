"use client";

import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconTile, type TileHue } from "@/components/ui/IconTile";
import { Pill } from "@/components/ui/Pill";
import type { DocumentKind } from "@/lib/auth/db";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/documents";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHydrated, useStore } from "@/lib/store";

export interface ReportItem {
  id: string;
  title: string;
  kind: DocumentKind;
  note: string | null;
  fileName: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
  seen: boolean;
  sentBy: string | null;
}

const KIND_TILE: Record<DocumentKind, { icon: string; hue: TileHue }> = {
  report: { icon: "FileText", hue: "sky" },
  image: { icon: "FileImage", hue: "pink" },
  document: { icon: "Paperclip", hue: "violet" },
};

/**
 * What the clinic has sent this patient. Read-only by design: there is no
 * upload here, and no camera anywhere in the app — material about a patient
 * comes from the clinician, through the admin panel, never the other way.
 */
export function ReportsScreen({ documents }: { documents: ReportItem[] }) {
  const { t } = useTranslation();
  const hydrated = useHydrated();
  const lang = useStore((s) => s.language);
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const dtf = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{t("reports.title")}</h1>
        <p className="text-sm text-muted">{t("reports.sub")}</p>
      </header>

      {documents.length === 0 ? (
        <EmptyState
          icon={<IconTile icon="Inbox" hue="sky" size="xl" />}
          title={t("reports.empty")}
          description={t("reports.emptySub")}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((d) => {
            const tile = KIND_TILE[d.kind] ?? KIND_TILE.document;
            const isImage = d.mime.startsWith("image/");
            const href = `/api/documents/${d.id}`;
            return (
              <li key={d.id}>
                <Card
                  padded={false}
                  className={cn("overflow-hidden", !d.seen && "ring-2 ring-primary/40")}
                >
                  {/* Images preview inline — a photo of a mouth or a scan is
                      the content, not an attachment to it. */}
                  {isImage && (
                    <a href={href} target="_blank" rel="noreferrer" className="block bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={href}
                        alt={d.title}
                        className="max-h-64 w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  )}
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <IconTile icon={tile.icon} hue={tile.hue} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-bold text-fg">{d.title}</p>
                          {!d.seen && <Pill tone="primary">{t("reports.newTag")}</Pill>}
                        </div>
                        <p className="text-sm text-muted">
                          {t(`reports.kind.${d.kind}`)} · {formatBytes(d.sizeBytes)} ·{" "}
                          {t("reports.sentOn", { date: dtf.format(new Date(d.createdAt)) })}
                        </p>
                        {d.sentBy && (
                          <p className="text-xs text-muted">{t("reports.sentBy", { name: d.sentBy })}</p>
                        )}
                      </div>
                    </div>
                    {d.note && <p className="text-sm leading-relaxed text-fg">{d.note}</p>}
                    <div className="flex gap-2">
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonClasses({ variant: "soft", size: "sm" })}
                      >
                        <Icon name="Eye" className="size-4" />
                        {t("reports.open")}
                      </a>
                      <a
                        href={`${href}?download=1`}
                        className={buttonClasses({ variant: "secondary", size: "sm" })}
                      >
                        <Icon name="Download" className="size-4" />
                        {t("reports.download")}
                      </a>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-start gap-2 px-1 text-xs text-muted">
        <Icon name="ShieldCheck" className="mt-0.5 size-4 shrink-0 text-success" />
        {t("reports.privacy")}
      </p>
    </div>
  );
}
