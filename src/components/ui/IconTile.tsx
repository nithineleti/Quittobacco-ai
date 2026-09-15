import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

/**
 * A feature's colour signature: a rounded, tinted square with its icon.
 *
 * Every destination in the app owns one hue, and keeps it everywhere it
 * appears (dashboard grid, profile row, empty state), so a reader who does not
 * read English or Hindi confidently can still navigate by colour — the same
 * convention UPI and delivery apps have taught this audience already.
 */
export type TileHue =
  | "violet"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "orange"
  | "teal"
  | "pink"
  | "gradient";

const HUES: Record<TileHue, string> = {
  violet: "bg-tile-violet text-tile-violet-fg",
  sky: "bg-tile-sky text-tile-sky-fg",
  emerald: "bg-tile-emerald text-tile-emerald-fg",
  amber: "bg-tile-amber text-tile-amber-fg",
  rose: "bg-tile-rose text-tile-rose-fg",
  orange: "bg-tile-orange text-tile-orange-fg",
  teal: "bg-tile-teal text-tile-teal-fg",
  pink: "bg-tile-pink text-tile-pink-fg",
  gradient: "bg-brand-gradient shadow-float",
};

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { box: string; icon: string }> = {
  sm: { box: "size-9 rounded-[0.7rem]", icon: "size-[1.15rem]" },
  md: { box: "size-11 rounded-tile", icon: "size-[1.4rem]" },
  lg: { box: "size-14 rounded-tile", icon: "size-7" },
  xl: { box: "size-20 rounded-card", icon: "size-10" },
};

export function IconTile({
  icon,
  hue = "violet",
  size = "md",
  className,
}: {
  icon: string;
  hue?: TileHue;
  size?: Size;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        s.box,
        HUES[hue],
        className,
      )}
    >
      <Icon name={icon} className={s.icon} />
    </span>
  );
}
