export type MicCapture = {
  stream: MediaStream;
  mimeType: string;
};

export async function openMicrophone(): Promise<MicCapture> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";

  return { stream, mimeType };
}

export function releaseMicrophone(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export class AudioChunkRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  start(stream: MediaStream, mimeType: string): void {
    this.chunks = [];
    const options = mimeType ? { mimeType } : undefined;
    this.recorder = new MediaRecorder(stream, options);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(250);
  }

  async stop(): Promise<Blob> {
    const recorder = this.recorder;
    if (!recorder) return new Blob();

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || this.chunks[0]?.type || "audio/webm";
        resolve(new Blob(this.chunks, { type }));
      };
      if (recorder.state === "recording") {
        try {
          recorder.requestData();
        } catch {
          /* optional on some browsers */
        }
        recorder.stop();
      } else {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || "audio/webm" }));
      }
    });
  }

  isRecording(): boolean {
    return this.recorder?.state === "recording";
  }
}

function filenameForBlob(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "speech.m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "speech.mp3";
  if (type.includes("ogg")) return "speech.ogg";
  if (type.includes("wav")) return "speech.wav";
  return "speech.webm";
}

const TRANSCRIBE_TIMEOUT_MS = 45_000;

export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, filenameForBlob(blob));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

  try {
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const data = (await res.json()) as { text?: string; error?: string; hint?: string };

    if (!res.ok) {
      throw new Error(
        data.hint ??
          data.error ??
          (res.status === 503
            ? "Speech-to-text is not configured. Add OPENAI_API_KEY on Vercel and redeploy."
            : "Transcription failed"),
      );
    }

    return data.text?.trim() ?? "";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Transcription timed out. Try again or type your question above.");
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}