"use client";

type GuidedFingerCoachProps = {
  label: string;
  /** Placement relative to the target */
  placement?: "right" | "left" | "above" | "below-left";
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
      ? "absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-[95%] flex-col items-center"
      : placement === "below-left"
        ? "absolute bottom-0 left-2 z-30 flex translate-y-[105%] flex-col items-start"
        : placement === "left"
          ? // Sit to the left of the target, finger points right at it
            "absolute right-full top-1/2 z-30 mr-1 flex -translate-y-1/2 flex-row-reverse items-center gap-1 sm:mr-2"
          : "absolute -right-1 top-1/2 z-30 flex -translate-y-1/2 translate-x-[10%] flex-col items-center sm:translate-x-[30%]";

  const finger =
    placement === "left" ? (
      <span className="voice-coach-finger-side text-3xl drop-shadow-md sm:text-4xl" aria-hidden>
        {"\u{1F449}"}
      </span>
    ) : (
      <span className="voice-coach-finger text-3xl drop-shadow-md sm:text-4xl" aria-hidden>
        {"\u{1F446}"}
      </span>
    );

  return (
    <div className={`${position} ${className}`} role="status">
      <div
        className={`voice-coach-bubble max-w-[8.5rem] rounded-xl bg-[#8b5e34] px-2.5 py-1.5 text-center text-[10px] font-semibold leading-snug text-white shadow-lg sm:text-[11px] ${
          placement === "left" ? "order-2" : "mb-1"
        }`}
      >
        {label}
      </div>
      {finger}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={`pointer-events-auto rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#8b5e34] shadow ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2] ${
            placement === "left" ? "order-3 absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap" : "mt-1"
          }`}
        >
          {dismissLabel}
        </button>
      ) : null}
    </div>
  );
}
