/**
 * Share via the Web Share API, falling back to a WhatsApp deep link — the main
 * growth loop in India is a shared streak/reward win, not app-store discovery.
 */
export async function shareText(text: string, url?: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text, url });
      return;
    }
  } catch {
    // user cancelled or share failed — fall through to WhatsApp
  }
  const msg = encodeURIComponent(url ? `${text} ${url}` : text);
  if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  }
}
