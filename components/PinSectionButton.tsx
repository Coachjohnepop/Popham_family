"use client";

import { useOptionalReader } from "@/components/ReaderProvider";

type PinSectionButtonProps = {
  sectionId: string;
  /** Compact icon-style for lists */
  compact?: boolean;
  className?: string;
};

export default function PinSectionButton({
  sectionId,
  compact = false,
  className = "",
}: PinSectionButtonProps) {
  const reader = useOptionalReader();
  if (!reader) return null;

  const pinned = reader.isFavorite(sectionId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        reader.toggleFavorite(sectionId);
      }}
      className={
        compact
          ? `rounded-full px-2 py-1 text-sm transition ${
              pinned
                ? "bg-[#fdf2f8] text-[#db2777]"
                : "bg-[#efe4d2] text-[#8b5e34] hover:bg-[#e4d4bc]"
            } ${className}`
          : `rounded-full px-4 py-2 text-sm font-semibold transition ${
              pinned
                ? "bg-[#db2777] text-white hover:bg-[#be185d]"
                : "bg-[#fdf2f8] text-[#9d174d] hover:bg-[#fce7f3]"
            } ${className}`
      }
      title={pinned ? "Remove from My Path" : "Pin to My Path"}
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin section from favorites" : "Pin section to favorites"}
    >
      {compact ? (pinned ? "★" : "☆") : pinned ? "★ Pinned to My Path" : "☆ Pin to My Path"}
    </button>
  );
}
