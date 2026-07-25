/**
 * Renders a pretty streak card to a PNG and shares it — image via the Web Share
 * API where supported (Android Chrome), otherwise download + a WhatsApp text
 * link. A shared image is a stronger growth loop than plain text.
 */
export interface StreakCardData {
  days: number;
  name?: string;
  daysLabel: string;
  savedLabel: string;
  shareText: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function shareStreakCard(d: StreakCardData): Promise<void> {
  const scale = 2;
  const W = 540;
  const H = 540;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  const cs = getComputedStyle(document.documentElement);
  const tok = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  const surface = tok("--surface", "#fbfaf7");
  const card = tok("--card", "#ffffff");
  const border = tok("--border", "#e6e3da");
  const primary = tok("--primary", "#0e7a6b");
  const fg = tok("--fg", "#1b1e1c");
  const muted = tok("--muted", "#59645e");

  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, 28, 28, W - 56, H - 56, 28);
  ctx.fillStyle = card;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = border;
  ctx.stroke();

  const cx = W / 2;
  ctx.textAlign = "center";

  ctx.font = "128px serif";
  ctx.fillText("🌱", cx, 190);

  ctx.fillStyle = primary;
  ctx.font = "700 148px system-ui, sans-serif";
  ctx.fillText(String(d.days), cx, 340);

  ctx.fillStyle = fg;
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(d.daysLabel, cx, 388);

  ctx.fillStyle = muted;
  ctx.font = "28px system-ui, sans-serif";
  ctx.fillText(d.savedLabel, cx, 436);

  if (d.name) {
    ctx.fillStyle = fg;
    ctx.font = "600 28px system-ui, sans-serif";
    ctx.fillText(`— ${d.name}`, cx, 478);
  }

  ctx.fillStyle = primary;
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText("QuitTobacco", cx, d.name ? 502 : 480);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return;

  const file = new File([blob], "quittobacco.png", { type: "image/png" });
  try {
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], text: d.shareText });
      return;
    }
  } catch {
    // cancelled or unsupported — fall through
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quittobacco.png";
  a.click();
  URL.revokeObjectURL(url);
  window.open(`https://wa.me/?text=${encodeURIComponent(d.shareText)}`, "_blank", "noopener,noreferrer");
}
