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
  onTranscriptChange?: (text: string) => void;
  label?: string;
  activeLabel?: string;
  transcriptHint?: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function composeTranscript(results: SpeechRecognitionResultList): string {
  let committed = "";
  let interim = "";

  for (let i = 0; i < results.length; i += 1) {
    const chunk = results[i][0]?.transcript ?? "";
    if (results[i].isFinal) {
      committed += chunk;
      interim = "";
    } else {
      interim = chunk;
    }
  }

  return (committed + interim).trim();
}

export default function VoicePickButton({
  onTranscript,
  onError,
  onTranscriptChange,
  label = "Say where to begin",
  activeLabel = "Listening…",
  transcriptHint = "Speak, then tap Done when you finish.",
}: VoicePickButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const liveTranscriptRef = useRef("");
  const wantListeningRef = useRef(false);
  const errorReportedRef = useRef(false);
  const sessionRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscript, onError, onTranscriptChange]);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
    return () => {
      wantListeningRef.current = false;
      sessionRef.current += 1;
      const previous = recognitionRef.current;
      if (previous) {
        previous.onend = null;
        previous.onerror = null;
        previous.onresult = null;
        previous.onstart = null;
        previous.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const updateTranscript = useCallback((text: string) => {
    liveTranscriptRef.current = text;
    setLiveTranscript(text);
    onTranscriptChangeRef.current?.(text);
  }, []);

  const detachRecognition = useCallback((recognition: SpeechRecognition) => {
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.onstart = null;
  }, []);

  const abortEngine = useCallback(() => {
    const previous = recognitionRef.current;
    if (!previous) return;
    detachRecognition(previous);
    previous.abort();
    recognitionRef.current = null;
  }, [detachRecognition]);

  const endSession = useCallback(
    (opts?: { submit?: boolean; cancel?: boolean }) => {
      wantListeningRef.current = false;
      sessionRef.current += 1;
      abortEngine();
      setListening(false);
      setStarting(false);

      const text = liveTranscriptRef.current.trim();
      if (opts?.submit) {
        if (text) {
          onTranscriptRef.current(text);
        } else {
          onErrorRef.current?.("No speech captured. Tap the mic and try again.");
        }
      } else if (opts?.cancel) {
        updateTranscript("");
      }
    },
    [abortEngine, updateTranscript],
  );

  const bindRecognition = useCallback(
    (recognition: SpeechRecognition, session: number) => {
      recognition.onstart = () => {
        if (session !== sessionRef.current || !wantListeningRef.current) return;
        setStarting(false);
        setListening(true);
      };

      recognition.onerror = (event) => {
        if (session !== sessionRef.current || !wantListeningRef.current) return;
        if (event.error === "aborted") return;
        if (event.error === "no-speech") return;

        errorReportedRef.current = true;
        wantListeningRef.current = false;
        sessionRef.current += 1;
        detachRecognition(recognition);
        recognitionRef.current = null;
        setListening(false);
        setStarting(false);

        const message = describeSpeechRecognitionError(event.error);
        if (message) onErrorRef.current?.(message);
      };

      recognition.onresult = (event) => {
        if (session !== sessionRef.current || !wantListeningRef.current) return;
        const text = composeTranscript(event.results);
        updateTranscript(text);
      };

      recognition.onend = () => {
        if (session !== sessionRef.current) return;
        recognitionRef.current = null;

        if (!wantListeningRef.current) {
          setListening(false);
          setStarting(false);
          return;
        }

        // Browsers end the session after ~1s of silence — restart while user hasn't tapped Done.
        void (async () => {
          await delay(200);
          if (!wantListeningRef.current || session !== sessionRef.current) return;

          const Ctor = getSpeechRecognitionCtor();
          if (!Ctor) return;

          try {
            const next = new Ctor();
            next.lang = "en-US";
            next.interimResults = true;
            next.maxAlternatives = 1;
            next.continuous = true;
            bindRecognition(next, session);
            recognitionRef.current = next;
            next.start();
          } catch {
            if (!wantListeningRef.current || session !== sessionRef.current) return;
            errorReportedRef.current = true;
            wantListeningRef.current = false;
            setListening(false);
            setStarting(false);
            onErrorRef.current?.("Listening paused. Tap Done with what we heard, or try again.");
          }
        })();
      };
    },
    [detachRecognition, updateTranscript],
  );

  const startEngine = useCallback(
    async (session: number) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return;

      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;
      bindRecognition(recognition, session);
      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch {
        if (session !== sessionRef.current) return;
        wantListeningRef.current = false;
        setStarting(false);
        setListening(false);
        onErrorRef.current?.("Could not start listening. Wait a second and tap again.");
      }
    },
    [bindRecognition],
  );

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.("Voice is not supported in this browser. Type your question instead.");
      return;
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    wantListeningRef.current = true;
    errorReportedRef.current = false;
    updateTranscript("");
    setStarting(true);
    setListening(false);

    const micError = await requestMicrophoneAccess();
    if (session !== sessionRef.current || !wantListeningRef.current) return;
    if (micError) {
      wantListeningRef.current = false;
      setStarting(false);
      onErrorRef.current?.(micError);
      return;
    }

    abortEngine();
    await delay(200);
    if (session !== sessionRef.current || !wantListeningRef.current) return;

    await startEngine(session);
  }, [abortEngine, startEngine, updateTranscript]);

  const handleDone = useCallback(() => {
    endSession({ submit: true });
  }, [endSession]);

  const handleCancel = useCallback(() => {
    endSession({ cancel: true });
  }, [endSession]);

  if (!supported) {
    return (
      <p className="text-sm text-[#6f5c49]">
        Voice needs Chrome or Safari. Type your question below — it works the same.
      </p>
    );
  }

  const busy = listening || starting;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="voice-pick-button"
          onClick={busy ? handleCancel : start}
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

        {listening && (
          <button
            type="button"
            data-testid="voice-done-button"
            onClick={handleDone}
            className="rounded-full bg-[#8b5e34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#744b2b]"
          >
            Done
          </button>
        )}

        {listening && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#6f5c49] ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2]"
          >
            Cancel
          </button>
        )}
      </div>

      {(listening || liveTranscript) && (
        <div
          className="rounded-2xl border border-[#ddd6fe] bg-white p-4"
          role="status"
          aria-live="polite"
          data-testid="voice-transcript-panel"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">
            {listening ? "Hearing you say…" : "Last heard"}
          </p>
          <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-[#2b2118]">
            {liveTranscript || (
              <span className="text-[#a8a29e]">Start speaking — words will appear here.</span>
            )}
          </p>
          {listening && (
            <p className="mt-2 text-xs text-[#6f5c49]">{transcriptHint}</p>
          )}
        </div>
      )}
    </div>
  );
}