const BRITISH_VOICE_HINTS = [
  "daniel",
  "serena",
  "kate",
  "martha",
  "arthur",
  "oliver",
  "fiona",
  "moira",
  "en-gb",
  "uk english",
  "british",
];

export function pickBritishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const enGb = voices.filter((v) => v.lang.toLowerCase().startsWith("en-gb"));
  if (enGb.length) {
    const premium = enGb.find(
      (v) =>
        !v.localService &&
        BRITISH_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)),
    );
    return premium ?? enGb[0];
  }

  return (
    voices.find((v) =>
      BRITISH_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)),
    ) ?? null
  );
}

export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }
    const onChange = () => {
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", onChange);
    setTimeout(() => resolve(synth.getVoices()), 500);
  });
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function speakBritishBrowser(
  text: string,
  onEnd?: () => void,
  onError?: () => void,
): () => void {
  const synth = window.speechSynthesis;
  synth.cancel();

  const sentences = splitSentences(text.replace(/\s+/g, " ").trim());
  let index = 0;
  let cancelled = false;

  const voice = pickBritishVoice();

  function speakNext() {
    if (cancelled || index >= sentences.length) {
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    index += 1;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-GB";
    }
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => speakNext();
    utterance.onerror = () => {
      onError?.();
      onEnd?.();
    };
    synth.speak(utterance);
  }

  speakNext();

  return () => {
    cancelled = true;
    synth.cancel();
  };
}