/**
 * The signature recovery metaphor: a plant that grows as tobacco-free days add
 * up. Eight stages tied to the reward milestones (seed → sprout → tree in
 * bloom). Pure SVG, token-coloured, no hooks — works in server or client trees.
 */

const STAGE_DAYS = [0, 1, 3, 7, 30, 90, 180, 365];

export function plantStage(days: number): number {
  let s = 0;
  for (let i = 0; i < STAGE_DAYS.length; i++) if (days >= STAGE_DAYS[i]) s = i;
  return s;
}

export function GrowingPlant({
  days,
  className,
  label,
}: {
  days: number;
  className?: string;
  label?: string;
}) {
  const stage = plantStage(days);
  const stemTop = [116, 100, 88, 70, 52, 40, 30, 22][stage];
  const leafCount = [0, 1, 2, 3, 4, 4, 5, 5][stage];
  const hasCanopy = stage >= 5;
  const hasFlower = stage >= 6;
  const sparkle = stage >= 7;

  const leaves = [];
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const y = 116 - (116 - stemTop) * t;
    const side = i % 2 === 0 ? -1 : 1;
    const scale = 0.85 + 0.2 * (1 - t);
    leaves.push(
      <g key={i} transform={`translate(60 ${y}) rotate(${side * 32})`}>
        <ellipse
          cx={side * 9}
          cy={0}
          rx={11 * scale}
          ry={5 * scale}
          className={i % 2 === 0 ? "fill-plant-leaf" : "fill-plant-leaf-2"}
        />
      </g>,
    );
  }

  return (
    <svg
      viewBox="0 0 120 150"
      className={className}
      role="img"
      aria-label={label ?? "Your growing plant"}
    >
      {/* pot */}
      <path d="M40 119 H80 L76 145 H44 Z" className="fill-plant-pot" />
      <rect x="35" y="112" width="50" height="10" rx="2.5" className="fill-plant-pot-2" />
      <ellipse cx="60" cy="116" rx="20" ry="3.5" className="fill-plant-soil" />

      {stage === 0 ? (
        <circle cx="60" cy="111" r="3.5" className="fill-plant-leaf" />
      ) : (
        <>
          <path
            d={`M60 116 Q 55 ${(116 + stemTop) / 2} 60 ${stemTop}`}
            className="fill-none stroke-plant-stem"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {leaves}
          {hasCanopy && (
            <g>
              <circle cx="48" cy={stemTop + 5} r="12" className="fill-plant-leaf-2" />
              <circle cx="72" cy={stemTop + 5} r="12" className="fill-plant-leaf-2" />
              <circle cx="60" cy={stemTop - 7} r="12" className="fill-plant-leaf-2" />
              <circle cx="60" cy={stemTop} r="16" className="fill-plant-leaf" />
            </g>
          )}
          {hasFlower && (
            <g>
              <circle cx="50" cy={stemTop - 1} r="3.5" className="fill-gold-fill" />
              <circle cx="70" cy={stemTop + 3} r="3.5" className="fill-gold-fill" />
              <circle cx="60" cy={stemTop - 11} r="3.5" className="fill-gold-fill" />
            </g>
          )}
          {sparkle && (
            <g className="fill-gold-fill">
              <path d="M28 44 l1.6 4.2 l4.2 1.6 l-4.2 1.6 l-1.6 4.2 l-1.6 -4.2 l-4.2 -1.6 l4.2 -1.6 Z" />
              <path d="M94 32 l1.2 3.2 l3.2 1.2 l-3.2 1.2 l-1.2 3.2 l-1.2 -3.2 l-3.2 -1.2 l3.2 -1.2 Z" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
