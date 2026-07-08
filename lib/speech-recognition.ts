export type SpeechRecognitionCtor = new () => SpeechRecognition;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export async function requestMicrophoneAccess(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch {
    return "Microphone access is needed. On Mac: System Settings → Privacy & Security → Microphone → allow your browser. Then refresh and try again.";
  }
}

export function describeSpeechRecognitionError(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone blocked. Allow the mic for this site in your browser, or type your question below.";
    case "network":
      return "Voice needs an internet connection (browser sends audio for transcription). Type your question below, or check Wi‑Fi and try again.";
    case "no-speech":
      return "Didn't catch speech. Hold the button, speak clearly, then release — or type your question below.";
    case "audio-capture":
      return "No microphone found. Type your question below.";
    case "aborted":
      return "";
    default:
      return `Listening failed (${error}). Type your question below — that always works.`;
  }
}