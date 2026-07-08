"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DeepgramLiveSession } from "@/lib/deepgram-live";
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
  resolveVoiceEnvironment,
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
  /** Inside Ask panel — no duplicate instruction banner */
  embedded?: boolean;
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
  embedded = false,
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
  const deepgramLiveRef = useRef<DeepgramLiveSession | null>(null);
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
    let cancelled = false;
    void resolveVoiceEnvironment().then((detected) => {
      if (cancelled) return;
      setEnv(detected);
      setMode(detected.mode);
    });
    return () => {
      cancelled = true;
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
    deepgramLiveRef.current?.cancel();
    deepgramLiveRef.current = null;
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

  const startDeepgramLive = useCallback(
    async (session: number) => {
      const stream = streamRef.current;
      if (!stream || session !== sessionRef.current || !wantSessionRef.current) return;

      updateTranscript("");
      const live = new DeepgramLiveSession();
      deepgramLiveRef.current = live;

      try {
        await live.start(stream, mimeTypeRef.current, {
          onTranscript: (text) => {
            if (session !== sessionRef.current || !wantSessionRef.current) return;
            updateTranscript(text);
          },
          onConnected: () => {
            if (session !== sessionRef.current || !wantSessionRef.current) return;
            setStarting(false);
            setSessionActive(true);
            setStatusLine(null);
          },
          onError: (message) => {
            if (session !== sessionRef.current) return;
            onErrorRef.current?.(message);
          },
        });
      } catch (err) {
        if (session !== sessionRef.current || !wantSessionRef.current) return;
        live.cancel();
        deepgramLiveRef.current = null;
        setMode("server-stt");
        setStatusLine("Live captions unavailable — recording instead. Tap Done to transcribe.");
        await startServerRecording(session);
      }
    },
    [startServerRecording, updateTranscript],
  );

  const switchToDeepgramLive = useCallback(
    async (session: number, reason?: string) => {
      if (session !== sessionRef.current || !wantSessionRef.current) return;

      setMode("deepgram-live");
      abortRecognition();
      if (reason) setStatusLine(reason);
      await startDeepgramLive(session);
    },
    [abortRecognition, startDeepgramLive],
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
          void switchToDeepgramLive(session, `${message} Switched to Deepgram live captions.`);
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
            await switchToDeepgramLive(session);
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
            await switchToDeepgramLive(session);
          }
        })();
      };
    },
    [switchToDeepgramLive, teardownSession, updateTranscript],
  );

  const startWebSpeech = useCallback(
    async (session: number) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        await switchToDeepgramLive(session);
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
        await switchToDeepgramLive(session);
      }
    },
    [bindRecognition, switchToDeepgramLive],
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

      if (activeMode === "deepgram-live") {
        await startDeepgramLive(session);
        return;
      }

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
  }, [mode, startDeepgramLive, startServerRecording, startWebSpeech, teardownSession, updateTranscript]);

  const handleDone = useCallback(async () => {
    wantSessionRef.current = false;

    if (mode === "deepgram-live" && deepgramLiveRef.current) {
      setSessionActive(false);
      setStatusLine("Finishing…");

      try {
        const text = await deepgramLiveRef.current.stop();
        deepgramLiveRef.current = null;
        releaseMicrophone(streamRef.current);
        streamRef.current = null;

        if (!text) {
          throw new Error("Couldn't make out words. Try again or type your question.");
        }

        updateTranscript(text);
        setCompleted(true);
        setStatusLine("Got it — your answer is below (reading aloud now).");
        onTranscriptRef.current(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Live transcription failed.";
        onErrorRef.current?.(message);
        setStatusLine(message);
        setCompleted(false);
      } finally {
        setStarting(false);
      }
      return;
    }

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

  const liveMode = mode === "deepgram-live";
  const batchMode = mode === "server-stt";

  useEffect(() => {
    if (!sessionActive || !batchMode) return;
    const tick = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [sessionActive, batchMode]);

  const busy = sessionActive || starting || transcribing;

  if (env && env.mode === "server-stt" && !getSpeechRecognitionCtor()) {
    // still show server mode UI
  }

  const buttonPad = embedded ? "px-4 py-2" : "px-5 py-3";

  return (
    <div className={embedded ? "space-y-2" : "space-y-3"}>
      {!embedded && env?.instruction && !sessionActive && !transcribing && (
        <p className="rounded-xl border border-[#ddd6fe] bg-[#f5f3ff] px-4 py-3 text-sm text-[#5b21b6]">
          {env.instruction}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="voice-pick-button"
          onClick={busy ? handleCancel : start}
          disabled={starting}
          className={`inline-flex items-center gap-2 rounded-full ${buttonPad} text-sm font-semibold transition ${
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
                ? batchMode
                  ? "Recording…"
                  : activeLabel
                : label}
        </button>

        {sessionActive && (
          <button
            type="button"
            data-testid="voice-done-button"
            onClick={() => void handleDone()}
            className={`rounded-full bg-[#8b5e34] ${buttonPad} text-sm font-semibold text-white hover:bg-[#744b2b]`}
          >
            Done
          </button>
        )}

        {(sessionActive || transcribing) && (
          <button
            type="button"
            onClick={handleCancel}
            className={`rounded-full bg-white ${embedded ? "px-3 py-2" : "px-4 py-3"} text-sm font-semibold text-[#6f5c49] ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2]`}
          >
            Cancel
          </button>
        )}
      </div>

      {(sessionActive || transcribing || liveTranscript || statusLine) && (
        <div
          className={`rounded-xl border border-[#ddd6fe] bg-white ${embedded ? "p-3" : "p-4"}`}
          role="status"
          aria-live="polite"
          data-testid="voice-transcript-panel"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">
            {transcribing
              ? "Transcribing…"
              : sessionActive
                ? batchMode
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
            ) : sessionActive && batchMode ? (
              <span className="text-[#a8a29e]">
                Recording{recordingSeconds > 0 ? ` (${recordingSeconds}s)` : ""} — tap Done when
                finished; your words appear here.
              </span>
            ) : (
              <span className="text-[#a8a29e]">
                {liveMode || batchMode
                  ? "Tap the mic and start speaking — words appear here."
                  : "Start speaking — words will appear here."}
              </span>
            )}
          </p>
          {statusLine && <p className="mt-2 text-xs font-medium text-[#5b21b6]">{statusLine}</p>}
          {sessionActive && (
            <p className="mt-2 text-xs text-[#6f5c49]">
              {batchMode
                ? transcriptHint || "Speak, then tap Done."
                : transcriptHint || "Words appear as you speak. Tap Done when finished."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}