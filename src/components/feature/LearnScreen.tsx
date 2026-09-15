"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { ReadAloud } from "@/components/feature/ReadAloud";
import { VideoPlayer } from "@/components/feature/VideoPlayer";
import { Card } from "@/components/ui/Card";
import { IconTile, type TileHue } from "@/components/ui/IconTile";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { CONTENT, CONTENT_CATEGORIES, type ContentItem } from "@/data/content";
import { loc } from "@/data/types";
import { cn } from "@/lib/cn";
import { useHydrated, useStore } from "@/lib/store";

/** Videos and articles get different hues so the list scans at a glance. */
const TYPE_HUE: Record<ContentItem["type"], TileHue> = {
  video: "pink",
  article: "violet",
};

export function LearnScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const videos = useStore((s) => s.videos);
  const [cat, setCat] = useState<string>("all");
  const [selected, setSelected] = useState<ContentItem | null>(null);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const videoItems = CONTENT.filter((c) => c.type === "video");
  const videosDone = videoItems.filter((v) => videos[v.id]?.status === "completed").length;

  if (selected) {
    const readText = [loc(selected.title, lang), ...(selected.body ?? []).map((p) => loc(p, lang))].join(". ");
    return (
      <article className="animate-fade-in flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="ChevronLeft" className="size-4" />
          {t("learn.backToLearn")}
        </button>

        <div className="flex items-start gap-3">
          <IconTile icon={selected.icon} hue={TYPE_HUE[selected.type]} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">{loc(selected.title, lang)}</h1>
            <p className="mt-1 text-base text-muted">{loc(selected.summary, lang)}</p>
          </div>
        </div>

        {selected.type === "video" ? (
          <VideoPlayer id={selected.id} durationSec={selected.demoSeconds ?? 20} />
        ) : (
          <>
            <ReadAloud text={readText} className="self-start" />
            <div className="flex flex-col gap-3">
              {(selected.body ?? []).map((p, i) => (
                <p key={i} className="text-base leading-relaxed text-fg">
                  {loc(p, lang)}
                </p>
              ))}
            </div>
          </>
        )}
      </article>
    );
  }

  const list = cat === "all" ? CONTENT : CONTENT.filter((c) => c.categoryId === cat);

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-fg">{t("learn.title")}</h1>
        <p className="text-sm text-muted">{t("learn.subtitle")}</p>
      </header>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon="PlayCircle" hue="pink" size="sm" />
          <p className="flex-1 text-base font-semibold text-fg">
            {t("learn.videosDone", { done: videosDone, total: videoItems.length })}
          </p>
        </div>
        <ProgressBar
          value={(videosDone / videoItems.length) * 100}
          tone="primary"
          label={t("learn.videosDone", {
            done: videosDone,
            total: videoItems.length,
          })}
        />
      </Card>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "all", label: { en: t("learn.all"), hi: t("learn.all") } }, ...CONTENT_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-pill border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              cat === c.id
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-card text-muted hover:bg-surface-2",
            )}
          >
            {loc(c.label, lang)}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {list.map((item) => {
          const status = item.type === "video" ? videos[item.id]?.status : undefined;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="flex items-center gap-4 text-left">
                  <IconTile icon={item.icon} hue={TYPE_HUE[item.type]} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-fg">{loc(item.title, lang)}</p>
                    <p className="text-sm text-muted">{loc(item.summary, lang)}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.type === "video"
                        ? t("learn.minVideo", { n: item.durationMin })
                        : t("learn.minRead", { n: item.durationMin })}
                    </p>
                  </div>
                  {status === "completed" ? (
                    <Pill tone="success" className="shrink-0">
                      <Icon name="Check" className="size-3.5" />
                      {t("learn.completedTag")}
                    </Pill>
                  ) : status === "in-progress" ? (
                    <Pill tone="primary" className="shrink-0">
                      {t("learn.inProgressTag")}
                    </Pill>
                  ) : (
                    <Icon name={item.type === "video" ? "PlayCircle" : "ChevronRight"} className="size-5 shrink-0 text-muted" />
                  )}
                </Card>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
