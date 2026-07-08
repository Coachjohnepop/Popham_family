"use client";

import { getPromptById, type PromptChoice, type PromptChoiceGroup } from "@/lib/prompt-index";

type PromptChoicesPanelProps = {
  promptId: string;
  onPick?: (choice: PromptChoice) => void;
  compact?: boolean;
  /** Actions that render as clickable buttons when onPick is set */
  interactiveActions?: string[];
};

export default function PromptChoicesPanel({
  promptId,
  onPick,
  compact = false,
  interactiveActions,
}: PromptChoicesPanelProps) {
  const prompt = getPromptById(promptId);
  if (!prompt) return null;

  return (
    <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
        Good choices
      </p>
      <p className="mt-1 font-serif text-lg font-semibold text-[#2b2118]">{prompt.question}</p>
      {!compact && prompt.dadDocRef && (
        <p className="mt-1 text-xs text-[#6f5c49]">{prompt.dadDocRef}</p>
      )}

      <div className="mt-4 space-y-4">
        {prompt.choiceGroups.map((group) => (
          <ChoiceGroup
            key={group.id}
            group={group}
            onPick={onPick}
            compact={compact}
            interactiveActions={interactiveActions}
          />
        ))}
      </div>
    </div>
  );
}

function ChoiceGroup({
  group,
  onPick,
  compact,
  interactiveActions,
}: {
  group: PromptChoiceGroup;
  onPick?: (choice: PromptChoice) => void;
  compact?: boolean;
  interactiveActions?: string[];
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
        {group.label}
      </h4>
      <ul className={`mt-2 ${compact ? "space-y-1" : "space-y-2"}`}>
        {group.choices.map((choice) => (
          <li key={choice.id}>
            {onPick &&
            (choice.action === "chapter" ||
              choice.action === "resume" ||
              choice.action === "open-toc" ||
              interactiveActions?.includes(choice.action)) ? (
              <button
                type="button"
                onClick={() => onPick(choice)}
                className="w-full rounded-xl border border-[#e2d4bf] bg-white px-3 py-2 text-left text-sm transition hover:border-[#c8b08d] hover:bg-[#fffaf2]"
              >
                <span className="font-medium text-[#2b2118]">{choice.label}</span>
                {!compact && choice.say[0] && (
                  <span className="mt-0.5 block text-xs text-[#6f5c49]">
                    Say: &ldquo;{choice.say.slice(0, 3).join('", "')}&rdquo;
                  </span>
                )}
              </button>
            ) : (
              <div className="rounded-xl bg-white/70 px-3 py-2 text-sm">
                <span className="font-medium text-[#2b2118]">{choice.label}</span>
                {!compact && choice.say[0] && (
                  <span className="mt-0.5 block text-xs text-[#6f5c49]">
                    Say: &ldquo;{choice.say.slice(0, 3).join('", "')}&rdquo;
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}