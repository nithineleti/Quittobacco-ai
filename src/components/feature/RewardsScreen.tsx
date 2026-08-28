"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Confetti } from "@/components/feature/Confetti";
import { ScratchCard } from "@/components/feature/ScratchCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { DEMO_MODE } from "@/data/config";
import { cn } from "@/lib/cn";
import type { RewardRung } from "@/lib/rewards";
import { REWARD_LADDER } from "@/lib/rewards";
import { rewardLadder, streakDays } from "@/lib/selectors";
import { shareText } from "@/lib/share";
import { useHydrated, useStore } from "@/lib/store";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode(): string {
  const seg = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  return `${DEMO_MODE ? "DEMO" : "QT"}-${seg()}-${seg()}`;
}

export function RewardsScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const s = useStore();
  const claimReward = useStore((st) => st.claimReward);
  const redeemReward = useStore((st) => st.redeemReward);

  const [tab, setTab] = useState<"ladder" | "wallet">("ladder");
  const [claiming, setClaiming] = useState<RewardRung | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [revealed, setRevealed] = useState(false);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const now = new Date();
  const ladder = rewardLadder(s, now);
  const streak = streakDays(s, now);
  const claimedRungs = REWARD_LADDER.filter((r) => s.claimed[r.id]);

  const openClaim = (rung: RewardRung) => {
    const existing = s.claimed[rung.id]?.code;
    setClaimCode(existing ?? makeCode());
    setRevealed(!!existing);
    setClaiming(rung);
  };
  const closeClaim = () => {
    setClaiming(null);
    setRevealed(false);
  };
  const doReveal = () => {
    if (claiming) claimReward(claiming.id, claimCode);
    setRevealed(true);
  };
  const share = (rung: RewardRung) =>
    shareText(t("rewards.shareText", { reward: t(`rewards.ladder.${rung.id}.title`), days: streak }));

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{t("rewards.title")}</h1>
        <p className="text-sm text-muted">{t("rewards.subtitle")}</p>
      </header>

      <div className="flex rounded-pill bg-surface-2 p-1" role="tablist">
        {(["ladder", "wallet"] as const).map((tabKey) => (
          <button
            key={tabKey}
            role="tab"
            aria-selected={tab === tabKey}
            onClick={() => setTab(tabKey)}
            className={cn(
              "min-h-11 flex-1 rounded-pill text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === tabKey ? "bg-card text-fg shadow-float" : "text-muted",
            )}
          >
            {t(tabKey === "ladder" ? "rewards.ladderTab" : "rewards.walletTab")}
          </button>
        ))}
      </div>

      {tab === "ladder" ? (
        <>
          {/* Without this, "90 days tobacco-free" beside a locked 7-day reward
              reads as a bug rather than a rule. */}
          <p className="flex items-start gap-2 rounded-card bg-surface-2 px-4 py-3 text-sm text-muted">
            <Icon name="Info" className="mt-0.5 size-4 shrink-0" />
            {t("rewards.activeDaysNote")}
          </p>
          <ol className="flex flex-col gap-3">
          {ladder.map(({ rung, status }) => (
            <li key={rung.id}>
              <Card
                className={cn(
                  "flex items-center gap-4",
                  status.state === "claimed" && "bg-gold-soft",
                )}
              >
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid size-12 place-items-center rounded-pill",
                      status.state === "locked"
                        ? "bg-surface-2 text-muted"
                        : "bg-gold-soft text-gold",
                    )}
                  >
                    <Icon name={status.state === "locked" ? "Lock" : rung.icon} className="size-6" />
                  </span>
                  <span className="mt-1 text-xs font-semibold text-muted">
                    {t("common.dayN", { n: rung.day })}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-fg">
                    {t(`rewards.ladder.${rung.id}.title`)}
                  </p>
                  <p className="text-sm text-muted">{t(`rewards.ladder.${rung.id}.detail`)}</p>
                  <Pill tone={rung.kind === "real" ? "gold" : "neutral"} className="mt-1.5">
                    {rung.kind === "real" ? t("rewards.realTag") : t("rewards.digitalTag")}
                  </Pill>

                  {status.state === "needs-evidence" && status.missing && (
                    <div className="mt-2 rounded-card bg-warning-soft p-2">
                      <p className="text-xs font-semibold text-warning">{t("rewards.needsList")}</p>
                      <ul className="mt-1 list-inside list-disc text-xs text-warning">
                        {status.missing.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {status.state === "claimed" ? (
                    <Pill tone="success">
                      <Icon name="Check" className="size-4" />
                      {t("rewards.claimed")}
                    </Pill>
                  ) : status.state === "claimable" ? (
                    <Button variant="gold" size="sm" onClick={() => openClaim(rung)}>
                      {t("rewards.claim")}
                    </Button>
                  ) : status.state === "needs-evidence" ? (
                    <Pill tone="warning">{t("rewards.needEvidence")}</Pill>
                  ) : (
                    <Pill tone="neutral">
                      {t("rewards.moreDays", { count: status.daysRemaining })}
                    </Pill>
                  )}
                </div>
              </Card>
            </li>
          ))}
          </ol>
        </>
      ) : claimedRungs.length === 0 ? (
        <EmptyState
          icon={<Icon name="Gift" className="size-8" />}
          title={t("rewards.empty")}
          description={t("rewards.emptySub")}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {claimedRungs.map((rung) => {
            const claimed = s.claimed[rung.id];
            return (
              <Card key={rung.id} className="flex flex-col gap-3 bg-gold-soft">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-pill bg-gold-fill text-gold-fg">
                    <Icon name={rung.icon} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-fg">
                      {t(`rewards.ladder.${rung.id}.title`)}
                    </p>
                    <p className="text-sm text-muted">
                      {rung.kind === "real" ? t("rewards.realTag") : t("rewards.digitalTag")}
                    </p>
                  </div>
                  {claimed.redeemed && <Pill tone="neutral">{t("rewards.redeemed")}</Pill>}
                </div>

                {rung.kind === "real" && (
                  <div className="rounded-card border border-dashed border-gold-fill bg-card p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted">{t("rewards.code")}</p>
                    <p className="text-lg font-semibold tracking-widest text-fg">{claimed.code}</p>
                    {DEMO_MODE && (
                      <p className="mt-1 text-xs font-semibold text-danger">
                        {t("rewards.demoWatermark")}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted">{t("rewards.claimAt")}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => share(rung)}>
                    <Icon name="Share2" className="size-4" />
                    {t("rewards.shareWin")}
                  </Button>
                  {rung.kind === "real" && !claimed.redeemed && (
                    <Button variant="ghost" size="sm" onClick={() => redeemReward(rung.id)}>
                      {t("rewards.markRedeemed")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Claim / scratch sheet */}
      <Sheet open={!!claiming} onClose={closeClaim} title={t("rewards.sheetTitle")}>
        {claiming && (
          <div className="flex flex-col gap-4">
            <ScratchCard coverLabel={t("rewards.scratchHint")} onReveal={doReveal}>
              <div className="relative flex flex-col items-center gap-2 bg-gold-soft p-6 text-center">
                {revealed && <Confetti />}
                {revealed && (
                  <span
                    className="absolute top-6 size-24 rounded-pill bg-gold-fill/30 animate-ring-out"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "grid size-16 place-items-center rounded-pill bg-gold-fill text-gold-fg",
                    revealed && "animate-pop",
                  )}
                >
                  <Icon name={claiming.icon} className="size-8" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                  {claiming.kind === "real" ? t("rewards.realTag") : t("rewards.digitalReveal")}
                </p>
                <p className="text-xl font-semibold text-fg">
                  {t(`rewards.ladder.${claiming.id}.title`)}
                </p>
                <p className="text-sm text-muted">{t(`rewards.ladder.${claiming.id}.detail`)}</p>
                {claiming.kind === "real" && (
                  <div className="mt-1 w-full rounded-card border border-dashed border-gold-fill bg-card p-3">
                    <p className="text-xs uppercase tracking-wide text-muted">{t("rewards.code")}</p>
                    <p className="text-lg font-semibold tracking-widest text-fg">{claimCode}</p>
                    {DEMO_MODE && (
                      <p className="mt-1 text-xs font-semibold text-danger">
                        {t("rewards.demoWatermark")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScratchCard>

            {revealed && (
              <div className="flex flex-col gap-2">
                <Button variant="gold" onClick={() => share(claiming)}>
                  <Icon name="Share2" className="size-5" />
                  {t("rewards.shareWin")}
                </Button>
                <Button variant="ghost" onClick={closeClaim}>
                  {t("common.done")}
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
