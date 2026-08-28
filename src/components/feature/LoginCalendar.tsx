"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { toISODate } from "@/lib/format";
import { useStore } from "@/lib/store";

/**
 * A month grid of the days the user actually opened the app.
 *
 * These are the days that earn rewards, so the calendar is the honest picture
 * of why a reward is or isn't unlocked yet — not decoration.
 */

type DayKind = "future" | "blank" | "login" | "slip" | "missed";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function LoginCalendar() {
  const { t } = useTranslation();
  const loginDays = useStore((s) => s.loginDays);
  const slips = useStore((s) => s.slips);
  const checkIns = useStore((s) => s.checkIns);
  const quitDate = useStore((s) => s.quitDate);

  const [offset, setOffset] = useState(0); // months back from today

  const { cells, label, activeThisMonth, canGoForward } = useMemo(() => {
    const today = new Date();
    const cursor = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const first = startOfMonth(cursor);

    const loginSet = new Set(loginDays);
    const slipSet = new Set(slips.map((s) => s.date));
    const checkInSet = new Set(checkIns.map((c) => c.date));
    const todayISO = toISODate(today);
    const quitISO = quitDate ?? null;

    // Monday-first, matching how a week is read locally.
    const jsDay = first.getDay(); // 0 = Sunday
    const lead = (jsDay + 6) % 7;
    const daysInMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();

    const out: Array<{ key: string; day: number | null; iso: string | null; kind: DayKind; checkedIn: boolean }> = [];
    for (let i = 0; i < lead; i += 1) {
      out.push({ key: `pad-${i}`, day: null, iso: null, kind: "blank", checkedIn: false });
    }

    let active = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), day));
      let kind: DayKind;
      if (iso > todayISO) kind = "future";
      else if (slipSet.has(iso)) kind = "slip";
      else if (loginSet.has(iso)) { kind = "login"; if (!quitISO || iso >= quitISO) active += 1; }
      else kind = "missed";
      out.push({ key: iso, day, iso, kind, checkedIn: checkInSet.has(iso) });
    }

    const monthLabel = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(cursor);

    return {
      cells: out,
      label: monthLabel,
      activeThisMonth: active,
      canGoForward: offset < 0,
    };
  }, [offset, loginDays, slips, checkIns, quitDate]);

  const weekdays = t("calendar.weekdays", { returnObjects: true }) as unknown;
  const dayNames = Array.isArray(weekdays)
    ? (weekdays as string[])
    : ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-fg">{t("calendar.title")}</p>
          <p className="text-sm text-muted">
            {t("calendar.activeThisMonth", { count: activeThisMonth })}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label={t("calendar.prevMonth")}
            className="grid size-11 place-items-center rounded-pill text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="ChevronLeft" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={!canGoForward}
            aria-label={t("calendar.nextMonth")}
            className="grid size-11 place-items-center rounded-pill text-muted hover:bg-surface-2 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="ChevronRight" className="size-5" />
          </button>
        </div>
      </div>

      <p className="text-center text-sm font-semibold text-fg">{label}</p>

      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {dayNames.map((d, i) => (
          <span key={i} className="text-center text-xs font-medium text-muted">
            {d}
          </span>
        ))}
      </div>

      <div role="grid" aria-label={t("calendar.title")} className="grid grid-cols-7 gap-1">
        {cells.map((c) =>
          c.day === null ? (
            <span key={c.key} />
          ) : (
            <span
              key={c.key}
              role="gridcell"
              aria-label={
                c.iso
                  ? `${c.iso} — ${t(`calendar.state.${c.kind}`)}${c.checkedIn ? `, ${t("calendar.checkedIn")}` : ""}`
                  : undefined
              }
              className={cn(
                "relative grid aspect-square place-items-center rounded-card text-sm font-medium",
                c.kind === "login" && "bg-primary text-primary-fg",
                c.kind === "slip" && "bg-danger-soft text-danger",
                c.kind === "missed" && "bg-surface-2 text-muted",
                c.kind === "future" && "text-muted opacity-40",
              )}
            >
              {c.day}
              {/* A dot marks a day that also had a check-in. */}
              {c.checkedIn && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-pill",
                    c.kind === "login" ? "bg-primary-fg" : "bg-primary",
                  )}
                />
              )}
            </span>
          ),
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-primary" /> {t("calendar.state.login")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-surface-2" /> {t("calendar.state.missed")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-danger-soft" /> {t("calendar.state.slip")}
        </li>
      </ul>
    </Card>
  );
}
