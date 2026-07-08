export type DeepgramLiveHandlers = {
  onTranscript: (text: string) => void;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

type DeepgramLiveMessage = {
  type?: string;
  channel?: {
    alternatives?: Array<{ transcript?: string }>;
  };
  is_final?: boolean;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLiveToken(): Promise<string> {
  const res = await fetch("/api/deepgram-live-token", { method: "POST" });
  const data = (await res.json()) as { access_token?: string; error?: string; hint?: string };

  if (!res.ok || !data.access_token) {
    throw new Error(data.hint ?? data.error ?? "Could not start live transcription.");
  }

  return data.access_token;
}

function parseTranscript(message: DeepgramLiveMessage): string {
  return message.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
}

export class DeepgramLiveSession {
  private socket: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private committed = "";
  private interim = "";
  private handlers: DeepgramLiveHandlers | null = null;

  private emitTranscript(): void {
    const text = (this.committed + (this.interim ? ` ${this.interim}` : "")).trim();
    this.handlers?.onTranscript(text);
  }

  async start(stream: MediaStream, mimeType: string, handlers: DeepgramLiveHandlers): Promise<void> {
    this.handlers = handlers;
    this.committed = "";
    this.interim = "";

    const accessToken = await fetchLiveToken();
    const params = new URLSearchParams({
      model: "nova-2",
      language: "en",
      smart_format: "true",
      interim_results: "true",
      punctuate: "true",
      endpointing: "400",
    });

    const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, [
      "token",
      accessToken,
    ]);
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Live transcription connection timed out."));
      }, 12_000);

      socket.onopen = () => {
        window.clearTimeout(timeout);
        handlers.onConnected?.();
        resolve();
      };

      socket.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not connect to live transcription."));
      };
    });

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as DeepgramLiveMessage;
        if (data.type !== "Results") return;

        const transcript = parseTranscript(data);
        if (!transcript) return;

        if (data.is_final) {
          this.committed = `${this.committed} ${transcript}`.trim();
          this.interim = "";
        } else {
          this.interim = transcript;
        }

        this.emitTranscript();
      } catch {
        /* ignore malformed frames */
      }
    };

    socket.onerror = () => {
      handlers.onError?.("Live transcription interrupted. Try again or type your question.");
    };

    const mime =
      mimeType && typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "audio/webm";

    if (!MediaRecorder.isTypeSupported(mime)) {
      throw new Error("This browser cannot record audio for live transcription.");
    }

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    this.recorder = recorder;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    });

    recorder.start(250);
  }

  async stop(): Promise<string> {
    const recorder = this.recorder;
    const socket = this.socket;

    if (recorder && recorder.state === "recording") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.stop();
      });
    }

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      await delay(600);
      socket.close();
    }

    this.recorder = null;
    this.socket = null;
    this.handlers = null;

    return (this.committed + (this.interim ? ` ${this.interim}` : "")).trim();
  }

  cancel(): void {
    if (this.recorder && this.recorder.state === "recording") {
      this.recorder.stop();
    }
    this.socket?.close();
    this.recorder = null;
    this.socket = null;
    this.handlers = null;
    this.committed = "";
    this.interim = "";
  }
}