"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioChunkRecorder,
  openMicrophone,
  releaseMicrophone,
  transcribeAudioBlob,
} from "@/lib/media-recorder-capture";
import {
  describeSpeechRecognitionError,
  getSpeechRecognitionCtor,
} from "@/lib/speech-recognition";
import {
  getVoiceEnvironment,
  shouldFallbackToServerStt,
  type VoiceEnvironment,
  type VoiceInputMode,
} from "@/lib/voice-environment";

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
  const [env, setEnv] = useState<VoiceEnvironment | null>(null);
  const [mode, setMode] = useState<VoiceInputMode>("web-speech");
  const [sessionActive, setSessionActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef("");
  const recorderRef = useRef(new AudioChunkRecorder());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const liveTranscriptRef = useRef("");
  const wantSessionRef = useRef(false);
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
    const detected = getVoiceEnvironment();
    setEnv(detected);
    setMode(detected.mode);
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

  const abortRecognition = useCallback(() => {
    const previous = recognitionRef.current;
    if (!previous) return;
    detachRecognition(previous);
    previous.abort();
    recognitionRef.current = null;
  }, [detachRecognition]);

  const teardownSession = useCallback(() => {
    wantSessionRef.current = false;
    sessionRef.current += 1;
    abortRecognition();
    releaseMicrophone(streamRef.current);
    streamRef.current = null;
    setSessionActive(false);
    setStarting(false);
    setTranscribing(false);
    setRecordingSeconds(0);
  }, [abortRecognition]);

  const startServerRecording = useCallback(
    async (session: number) => {
      const stream = streamRef.current;
      if (!stream || session !== sessionRef.current || !wantSessionRef.current) return;

      recorderRef.current.start(stream, mimeTypeRef.current);
      setSessionActive(true);
      setStarting(false);
      setStatusLine("Recording your voice — tap Done when finished.");
      updateTranscript("");
    },
    [updateTranscript],
  );

  const switchToServerMode = useCallback(
    async (session: number, reason?: string) => {
      if (session !== sessionRef.current || !wantSessionRef.current) return;

      setMode("server-stt");
      abortRecognition();
      setStatusLine(
        reason ??
          "Browser blocked live captions — recording audio instead. Tap Done to transcribe.",
      );
      await startServerRecording(session);
    },
    [abortRecognition, startServerRecording],
  );

  const bindRecognition = useCallback(
    (recognition: SpeechRecognition, session: number) => {
      recognition.onstart = () => {
        if (session !== sessionRef.current || !wantSessionRef.current) return;
        setStarting(false);
        setSessionActive(true);
        setStatusLine(null);
      };

      recognition.onerror = (event) => {
        if (session !== sessionRef.current || !wantSessionRef.current) return;
        if (event.error === "aborted") return;
        if (event.error === "no-speech") return;

        if (shouldFallbackToServerStt(event.error) && streamRef.current) {
          const message = describeSpeechRecognitionError(event.error);
          void switchToServerMode(
            session,
            `${message} Switched to record-and-transcribe — keep speaking, then tap Done.`,
          );
          return;
        }

        teardownSession();
        const message = describeSpeechRecognitionError(event.error);
        if (message) onErrorRef.current?.(message);
      };

      recognition.onresult = (event) => {
        if (session !== sessionRef.current || !wantSessionRef.current) return;
        updateTranscript(composeTranscript(event.results));
      };

      recognition.onend = () => {
        if (session !== sessionRef.current) return;
        recognitionRef.current = null;
        if (!wantSessionRef.current) {
          setSessionActive(false);
          setStarting(false);
          return;
        }

        void (async () => {
          await delay(200);
          if (!wantSessionRef.current || session !== sessionRef.current) return;

          const Ctor = getSpeechRecognitionCtor();
          if (!Ctor) {
            await switchToServerMode(session);
            return;
          }

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
            await switchToServerMode(session);
          }
        })();
      };
    },
    [switchToServerMode, teardownSession, updateTranscript],
  );

  const startWebSpeech = useCallback(
    async (session: number) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        await switchToServerMode(session);
        return;
      }

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
        await switchToServerMode(session);
      }
    },
    [bindRecognition, switchToServerMode],
  );

  const start = useCallback(async () => {
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    wantSessionRef.current = true;
    updateTranscript("");
    setStatusLine(null);
    setStarting(true);
    setSessionActive(false);
    setTranscribing(false);
    setCompleted(false);
    setRecordingSeconds(0);

    const activeMode = mode;

    try {
      const capture = await openMicrophone();
      if (session !== sessionRef.current || !wantSessionRef.current) {
        releaseMicrophone(capture.stream);
        return;
      }

      streamRef.current = capture.stream;
      mimeTypeRef.current = capture.mimeType;

      if (activeMode === "server-stt") {
        await startServerRecording(session);
        return;
      }

      await startWebSpeech(session);
    } catch {
      if (session !== sessionRef.current) return;
      teardownSession();
      onErrorRef.current?.(
        "Microphone access is needed. Allow the mic for this site, or type your question instead.",
      );
    }
  }, [mode, startServerRecording, startWebSpeech, teardownSession, updateTranscript]);

  const handleDone = useCallback(async () => {
    wantSessionRef.current = false;

    if (mode === "server-stt" || recorderRef.current.isRecording()) {
      setTranscribing(true);
      setSessionActive(false);
      setStatusLine("Transcribing…");

      try {
        const blob = await recorderRef.current.stop();
        abortRecognition();
        releaseMicrophone(streamRef.current);
        streamRef.current = null;

        if (blob.size < 200) {
          throw new Error(
            `No audio captured (${blob.size} bytes). Allow the mic, speak for a few seconds, then tap Done.`,
          );
        }

        const text = await transcribeAudioBlob(blob);
        if (!text) throw new Error("Couldn't make out words. Try again or type your question.");

        updateTranscript(text);
        setCompleted(true);
        setStatusLine("Got it — your answer is below (reading aloud now).");
        onTranscriptRef.current(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transcription failed.";
        onErrorRef.current?.(message);
        setStatusLine(message);
        setCompleted(false);
      } finally {
        setTranscribing(false);
        setStarting(false);
      }
      return;
    }

    const text = liveTranscriptRef.current.trim();
    teardownSession();
    if (text) {
      onTranscriptRef.current(text);
    } else {
      onErrorRef.current?.("No speech captured. Tap the mic and try again.");
    }
  }, [abortRecognition, mode, teardownSession, updateTranscript]);

  const handleCancel = useCallback(() => {
    teardownSession();
    updateTranscript("");
    setStatusLine(null);
  }, [teardownSession, updateTranscript]);

  useEffect(() => {
    return () => teardownSession();
  }, [teardownSession]);

  const serverMode = mode === "server-stt";

  useEffect(() => {
    if (!sessionActive || !serverMode) return;
    const tick = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [sessionActive, serverMode]);

  const busy = sessionActive || starting || transcribing;

  if (env && env.mode === "server-stt" && !getSpeechRecognitionCtor()) {
    // still show server mode UI
  }

  return (
    <div className="space-y-3">
      {env?.warning && (
        <p className="rounded-xl border border-[#fdba74] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
          {env.warning}
        </p>
      )}

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
          {transcribing
            ? "Transcribing…"
            : starting
              ? "Starting…"
              : sessionActive
                ? serverMode
                  ? "Recording…"
                  : activeLabel
                : label}
        </button>

        {sessionActive && (
          <button
            type="button"
            data-testid="voice-done-button"
            onClick={() => void handleDone()}
            className="rounded-full bg-[#8b5e34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#744b2b]"
          >
            Done
          </button>
        )}

        {(sessionActive || transcribing) && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#6f5c49] ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2]"
          >
            Cancel
          </button>
        )}
      </div>

      {(sessionActive || transcribing || liveTranscript || statusLine) && (
        <div
          className="rounded-2xl border border-[#ddd6fe] bg-white p-4"
          role="status"
          aria-live="polite"
          data-testid="voice-transcript-panel"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">
            {transcribing
              ? "Transcribing…"
              : sessionActive
                ? serverMode
                  ? "Recording your voice"
                  : "Hearing you say…"
                : "Last heard"}
          </p>
          <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-[#2b2118]">
            {liveTranscript ? (
              <>
                {completed && (
                  <span className="mr-1 font-semibold text-[#15803d]">You said: </span>
                )}
                {liveTranscript}
              </>
            ) : sessionActive && serverMode ? (
              <span className="text-[#a8a29e]">
                Recording{recordingSeconds > 0 ? ` (${recordingSeconds}s)` : ""} — words appear
                after you tap Done (Brave can&apos;t show live captions).
              </span>
            ) : (
              <span className="text-[#a8a29e]">Start speaking — words will appear here.</span>
            )}
          </p>
          {statusLine && <p className="mt-2 text-xs font-medium text-[#5b21b6]">{statusLine}</p>}
          {sessionActive && !serverMode && (
            <p className="mt-2 text-xs text-[#6f5c49]">{transcriptHint}</p>
          )}
        </div>
      )}
    </div>
  );
}