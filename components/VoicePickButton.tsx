"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeSpeechRecognitionError,
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  requestMicrophoneAccess,
} from "@/lib/speech-recognition";

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
  const [starting, setStarting] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const gotResultRef = useRef(false);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setStarting(false);
  }, []);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError?.("Voice is not supported in this browser. Type your question instead.");
      return;
    }

    setStarting(true);
    gotResultRef.current = false;

    const micError = await requestMicrophoneAccess();
    if (micError) {
      setStarting(false);
      onError?.(micError);
      return;
    }

    stop();

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setStarting(false);
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
      setStarting(false);
      if (!gotResultRef.current) {
        onError?.("Didn't catch that. Speak right after tapping, or type your question below.");
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      setStarting(false);
      const message = describeSpeechRecognitionError(event.error);
      if (message) onError?.(message);
    };

    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) {
        gotResultRef.current = true;
        onTranscript(text);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setStarting(false);
      onError?.("Could not start listening. Wait a second and tap again, or type below.");
    }
  }, [onError, onTranscript, stop]);

  if (!supported) {
    return (
      <p className="text-sm text-[#6f5c49]">
        Voice needs Chrome or Safari. Type your question below — it works the same.
      </p>
    );
  }

  const busy = listening || starting;

  return (
    <button
      type="button"
      onClick={busy ? stop : start}
      disabled={starting}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
        busy
          ? "bg-[#7c3aed] text-white ring-2 ring-[#c4b5fd]"
          : "bg-[#f5f3ff] text-[#5b21b6] ring-1 ring-[#c4b5fd] hover:bg-[#ede9fe]"
      } disabled:opacity-70`}
    >
      <span aria-hidden>{busy ? "🎙️" : "🎤"}</span>
      {starting ? "Starting…" : listening ? activeLabel : label}
    </button>
  );
}