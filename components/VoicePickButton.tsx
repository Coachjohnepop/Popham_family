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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const errorReportedRef = useRef(false);
  const sessionRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
    return () => {
      sessionRef.current += 1;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const abortPrevious = useCallback(() => {
    const previous = recognitionRef.current;
    if (!previous) return;
    previous.onend = null;
    previous.onerror = null;
    previous.onresult = null;
    previous.onstart = null;
    previous.abort();
    recognitionRef.current = null;
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    abortPrevious();
    setListening(false);
    setStarting(false);
  }, [abortPrevious]);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("Voice is not supported in this browser. Type your question instead.");
      return;
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    gotResultRef.current = false;
    errorReportedRef.current = false;
    setStarting(true);
    setListening(false);

    const micError = await requestMicrophoneAccess();
    if (session !== sessionRef.current) return;
    if (micError) {
      setStarting(false);
      onErrorRef.current?.(micError);
      return;
    }

    abortPrevious();
    await delay(250);
    if (session !== sessionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => {
      if (session !== sessionRef.current) return;
      setStarting(false);
      setListening(true);
    };

    recognition.onerror = (event) => {
      if (session !== sessionRef.current) return;
      if (event.error === "aborted") return;
      errorReportedRef.current = true;
      setListening(false);
      setStarting(false);
      const message = describeSpeechRecognitionError(event.error);
      if (message) onErrorRef.current?.(message);
    };

    recognition.onend = () => {
      if (session !== sessionRef.current) return;
      recognitionRef.current = null;
      setListening(false);
      setStarting(false);
      if (!gotResultRef.current && !errorReportedRef.current) {
        onErrorRef.current?.(
          "Didn't catch that. Tap again and speak right away, or type your question below.",
        );
      }
    };

    recognition.onresult = (event) => {
      if (session !== sessionRef.current) return;

      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i];
        if (chunk.isFinal) {
          finalText = chunk[0]?.transcript ?? "";
        }
      }

      const text = finalText.trim();
      if (!text) return;

      gotResultRef.current = true;
      errorReportedRef.current = true;
      setListening(false);
      setStarting(false);
      try {
        recognition.stop();
      } catch {
        /* session may already be closed */
      }
      onTranscriptRef.current(text);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      if (session !== sessionRef.current) return;
      setStarting(false);
      setListening(false);
      onErrorRef.current?.("Could not start listening. Wait a second and tap again, or type below.");
    }
  }, [abortPrevious]);

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
      data-testid="voice-pick-button"
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