/** Tiny class-name joiner. Avoids a clsx dependency for the bundle budget. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
