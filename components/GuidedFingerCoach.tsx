"use client";

type GuidedFingerCoachProps = {
  label: string;
  /** Placement relative to the target */
  placement?: "right" | "above" | "below-left";
  className?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
};

/**
 * Bouncing finger + tip bubble for guided learning.
 * Parent should be `relative` (or use placement classes that work with the layout).
 */
export default function GuidedFingerCoach({
  label,
  placement = "right",
  className = "",
  onDismiss,
  dismissLabel = "Got it",
}: GuidedFingerCoachProps) {
  const position =
    placement === "above"
      ? "absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-[90%] flex-col items-center"
      : placement === "below-left"
        ? "absolute bottom-0 left-2 z-30 flex translate-y-[105%] flex-col items-start"
        : "absolute -right-1 top-1/2 z-30 flex -translate-y-1/2 translate-x-[10%] flex-col items-center sm:translate-x-[30%]";

  return (
    <div className={`${position} ${className}`} role="status">
      <div className="voice-coach-bubble mb-1 max-w-[8.5rem] rounded-xl bg-[#8b5e34] px-2.5 py-1.5 text-center text-[10px] font-semibold leading-snug text-white shadow-lg sm:text-[11px]">
        {label}
      </div>
      <span className="voice-coach-finger text-3xl drop-shadow-md sm:text-4xl" aria-hidden>
        {"\u{1F446}"}
      </span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="pointer-events-auto mt-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#8b5e34] shadow ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2]"
        >
          {dismissLabel}
        </button>
      ) : null}
    </div>
  );
}
