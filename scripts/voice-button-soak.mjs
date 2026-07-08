#!/usr/bin/env node
/**
 * Voice button soak test — runs ~1 hour against local or prod.
 * Uses a mock SpeechRecognition in the browser to verify button state machine.
 *
 * Usage:
 *   node scripts/voice-button-soak.mjs
 *   BASE_URL=https://coss-family-story.vercel.app DURATION_SEC=3600 node scripts/voice-button-soak.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DURATION_SEC = Number(process.env.DURATION_SEC ?? 3600);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 12000);

const MOCK_SCRIPT = () => {
  navigator.mediaDevices.getUserMedia = async () => ({
    getTracks: () => [{ stop() {} }],
  });

  class MockSpeechRecognition extends EventTarget {
    constructor() {
      super();
      this.lang = "en-US";
      this.continuous = true;
      this.interimResults = true;
      this.maxAlternatives = 1;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onresult = null;
    }

    _mode() {
      return window.__voiceSoakMode ?? "success";
    }

    start() {
      const mode = this._mode();
      setTimeout(() => this.onstart?.(new Event("start")), 15);

      if (mode === "instant-end") {
        setTimeout(() => this.onend?.(new Event("end")), 40);
        return;
      }

      if (mode === "network-error") {
        setTimeout(() => {
          this.onerror?.({ error: "network", message: "network" });
          this.onend?.(new Event("end"));
        }, 60);
        return;
      }

      setTimeout(() => {
        const results = [
          {
            isFinal: true,
            length: 1,
            0: { transcript: "salem witch trials", confidence: 0.95 },
          },
        ];
        Object.setPrototypeOf(results, Array.prototype);
        this.onresult?.({
          resultIndex: 0,
          results,
        });
        setTimeout(() => this.onend?.(new Event("end")), 20);
      }, 180);
    }

    stop() {
      setTimeout(() => this.onend?.(new Event("end")), 10);
    }

    abort() {
      setTimeout(() => this.onend?.(new Event("end")), 10);
    }
  }

  window.SpeechRecognition = MockSpeechRecognition;
  window.webkitSpeechRecognition = MockSpeechRecognition;
};

const PAGES = [
  {
    name: "salem-ask",
    path: "/story/salem-witch-trials",
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "wcft-reader-session",
          JSON.stringify({
            readerName: "Soak Tester",
            onboardingComplete: true,
            answerDepth: "standard",
          }),
        );
      });
    },
    buttonLabel: "Or say your question",
    activeLabel: "Listening…",
  },
  {
    name: "guided-intro",
    path: "/read",
    setup: async (page) => {
      await page.evaluate(() => {
        localStorage.setItem(
          "wcft-reader-session",
          JSON.stringify({
            readerName: "Soak Tester",
            onboardingComplete: false,
          }),
        );
      });
    },
    buttonLabel: "Say where to begin",
    activeLabel: "Listening…",
  },
];

async function runCycle(page, spec, mode) {
  await page.goto(`${BASE_URL}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await spec.setup(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate((m) => {
    window.__voiceSoakMode = m;
  }, mode);

  const button = page.getByTestId("voice-pick-button").first();
  await button.waitFor({ state: "visible", timeout: 15000 });

  await button.click();

  const handle = await button.elementHandle();
  await page
    .waitForFunction(
      (node) => {
        const text = node?.textContent?.toLowerCase() ?? "";
        return (
          text.includes("listening") ||
          text.includes("starting") ||
          text.includes("recording")
        );
      },
      handle,
      { timeout: 5000 },
    )
    .catch(async () => {
      const midText = await button.innerText();
      throw new Error(`Expected listening state, got "${midText}"`);
    });

  const doneButton = page.getByTestId("voice-done-button").first();
  const transcriptPanel = page.getByTestId("voice-transcript-panel").first();

  if (mode === "success") {
    await transcriptPanel.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('[data-testid="voice-transcript-panel"]');
        return panel?.textContent?.toLowerCase().includes("salem");
      },
      { timeout: 5000 },
    );
    await doneButton.click();
    await page.waitForTimeout(300);
    const endText = await button.innerText();
    if (endText.toLowerCase().includes("listening")) {
      throw new Error(`Stuck in listening state after Done: "${endText}"`);
    }
    return "success-restored";
  }

  if (mode === "instant-end") {
    await page.waitForTimeout(700);
    await doneButton.waitFor({ state: "visible", timeout: 5000 });
    const stillListening = await button.innerText();
    if (!stillListening.toLowerCase().includes("listening")) {
      throw new Error(`Session ended early after browser onend: "${stillListening}"`);
    }
    await page.getByRole("button", { name: "Cancel" }).first().click();
    return "instant-end-stayed-listening";
  }

  if (mode === "network-error") {
    const alert = page.locator('[role="alert"], .text-\\[\\#b45309\\]').first();
    await alert.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    return "network-error-handled";
  }

  return "unknown";
}

async function main() {
  const endAt = Date.now() + DURATION_SEC * 1000;
  const modes = ["success", "instant-end", "network-error"];
  let passed = 0;
  let failed = 0;
  let cycle = 0;

  console.log(`Voice soak: ${BASE_URL} for ${DURATION_SEC}s (every ${INTERVAL_MS}ms)`);

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  });
  const context = await browser.newContext({
    permissions: ["microphone"],
  });
  await context.addInitScript(MOCK_SCRIPT);
  const page = await context.newPage();

  while (Date.now() < endAt) {
    cycle += 1;
    const spec = PAGES[cycle % PAGES.length];
    const mode = modes[cycle % modes.length];
    const started = Date.now();

    try {
      const outcome = await runCycle(page, spec, mode);
      passed += 1;
      console.log(
        `[${new Date().toISOString()}] #${cycle} PASS ${spec.name}/${mode} → ${outcome} (${Date.now() - started}ms) | total ${passed}/${passed + failed}`,
      );
    } catch (err) {
      failed += 1;
      console.error(
        `[${new Date().toISOString()}] #${cycle} FAIL ${spec.name}/${mode}: ${err.message} | total ${passed}/${passed + failed}`,
      );
    }

    const remaining = endAt - Date.now();
    if (remaining <= 0) break;
    await page.waitForTimeout(Math.min(INTERVAL_MS, remaining));
  }

  await browser.close();

  const summary = { passed, failed, cycles: passed + failed, baseUrl: BASE_URL, durationSec: DURATION_SEC };
  console.log("SOAK SUMMARY", JSON.stringify(summary));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Soak crashed:", err);
  process.exit(1);
});