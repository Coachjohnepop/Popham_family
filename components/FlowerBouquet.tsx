/**
 * Compact floral bouquet — sized like the site title, used as brand mark
 * and easter-egg entry to the Subjects Covered checklist.
 */
type FlowerBouquetProps = {
  className?: string;
  /** Visual scale; keep modest vs title (default ~ title x-height). */
  size?: "title" | "sm" | "md";
  title?: string;
};

const SIZE_CLASS = {
  title: "h-[1.15em] w-[1.15em] max-h-10 max-w-10 sm:max-h-12 sm:max-w-12",
  sm: "h-7 w-7",
  md: "h-9 w-9 sm:h-10 sm:w-10",
} as const;

export default function FlowerBouquet({
  className = "",
  size = "title",
  title = "Bouquet of wildflowers",
}: FlowerBouquetProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${SIZE_CLASS[size]} shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Stems */}
      <path
        d="M32 58c0-10 2-18 2-26M28 56c2-12 0-20-2-28M36 56c-1-10 2-20 4-28"
        fill="none"
        stroke="#4d7c4d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Leaves */}
      <ellipse cx="24" cy="42" rx="5" ry="2.5" fill="#5f9e5f" transform="rotate(-35 24 42)" />
      <ellipse cx="40" cy="44" rx="5" ry="2.5" fill="#5f9e5f" transform="rotate(30 40 44)" />
      {/* Blooms */}
      <g>
        <circle cx="32" cy="18" r="7" fill="#e8a0bf" />
        <circle cx="32" cy="18" r="3" fill="#f5d0e0" />
        <circle cx="22" cy="24" r="6" fill="#c97b9a" />
        <circle cx="22" cy="24" r="2.5" fill="#f0c4d4" />
        <circle cx="42" cy="24" r="6" fill="#d4849c" />
        <circle cx="42" cy="24" r="2.5" fill="#f2c8d8" />
        <circle cx="28" cy="28" r="5" fill="#b86b8a" />
        <circle cx="36" cy="29" r="5" fill="#c47898" />
        <circle cx="32" cy="26" r="3.5" fill="#f7e6a8" />
      </g>
    </svg>
  );
}
