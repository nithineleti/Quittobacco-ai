"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { RecoveryRing } from "@/components/feature/RecoveryRing";
import { Button } from "@/components/ui/Button";
import i18n from "@/i18n/client";
import { formatINR } from "@/lib/format";
import { recoveryPercent } from "@/lib/health";
import { shareText } from "@/lib/share";

/**
 * Read-only page a supporter opens from a shared link. No account, no app shell.
 * Renders in the language the link was shared in (getFixedT, independent of the
 * live i18n language). Encouragement goes back out via WhatsApp.
 */
export function SupporterScreen() {
  const sp = useSearchParams();
  const lang = sp.get("l") === "hi" ? "hi" : "en";
  const t = i18n.getFixedT(lang);

  const days = Math.max(0, Number.parseInt(sp.get("d") ?? "0", 10) || 0);
  const saved = Math.max(0, Number.parseInt(sp.get("s") ?? "0", 10) || 0);
  const name = (sp.get("n") ?? "").trim() || t("supporter.someone");

  const encourage = () => shareText(t("supporter.encourageText", { days }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <Brand className="self-center" />

      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center">
        <RecoveryRing
          percent={recoveryPercent(days)}
          size={120}
          label={t("supporter.daysFree", { count: days })}
        />
        <h1 className="text-2xl font-bold tracking-tight">{t("supporter.title", { name })}</h1>
        <p className="text-lg font-semibold opacity-95">
          {t("supporter.daysFree", { count: days })}
        </p>
        {saved > 0 && (
          <p className="text-sm opacity-90">
            {t("supporter.savedLine", { amount: formatINR(saved) })}
          </p>
        )}
      </div>

      <p className="text-center text-base text-muted">{t("supporter.body")}</p>

      <div className="flex flex-col gap-2">
        <Button size="lg" full onClick={encourage}>
          <Icon name="Share2" className="size-5" />
          {t("supporter.sendBtn")}
        </Button>
        <Link
          href="/"
          className="py-2 text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t("supporter.getApp")}
        </Link>
      </div>
    </main>
  );
}
