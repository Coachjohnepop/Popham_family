"use client";

import { useCallback, useEffect, useState } from "react";

type ReadAloudButtonProps = {
  text: string;
  label?: string;
};

export default function ReadAloudButton({ text, label = "Read aloud" }: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!supported || typeof window === "undefined") return;
    stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [supported, text, stop]);

  useEffect(() => () => stop(), [stop]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        speaking
          ? "bg-[#8b5e34] text-white"
          : "bg-[#efe4d2] text-[#5c4a38] hover:bg-[#e4d4bc]"
      }`}
    >
      {speaking ? "Stop reading" : label}
    </button>
  );
}