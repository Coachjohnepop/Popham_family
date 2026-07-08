"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type VoicePickButtonProps = {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  label?: string;
  activeLabel?: string;
};

export default function VoicePickButton({
  onTranscript,
  onError,
  label = "Say where to begin",
  activeLabel = "Listening…",
}: VoicePickButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      onError?.("Voice input is not supported in this browser. Click a chapter instead.");
      return;
    }

    stop();
    const recognition = new Ctor();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "aborted") return;
      onError?.(
        event.error === "not-allowed"
          ? "Microphone permission denied. Allow the mic in browser settings, or click a chapter."
          : `Could not hear you (${event.error}). Try again or click a chapter.`,
      );
    };
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) onTranscript(text);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onError, onTranscript, stop]);

  if (!supported) {
    return (
      <p className="text-sm text-[#6f5c49]">
        Voice pick needs Chrome or Safari. Click a chapter below, or type in search from the story
        tab.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
        listening
          ? "bg-[#7c3aed] text-white ring-2 ring-[#c4b5fd]"
          : "bg-[#f5f3ff] text-[#5b21b6] ring-1 ring-[#c4b5fd] hover:bg-[#ede9fe]"
      }`}
    >
      <span aria-hidden>{listening ? "🎙️" : "🎤"}</span>
      {listening ? activeLabel : label}
    </button>
  );
}