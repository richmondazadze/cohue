import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { webmDurationMs } from "@/server/domain/webm-duration";
import { validateAudioDuration } from "@/server/domain/audio-duration";

// Real Chrome MediaRecorder output (fake microphone, ~3.5 s). Its header carries no Duration.
const clip = new Uint8Array(readFileSync(new URL("./fixtures/chrome-mediarecorder-3s.webm", import.meta.url)));

describe("live-recorded WebM duration", () => {
  it("measures the block timeline when the header has no duration", () => {
    const ms = webmDurationMs(clip)!;
    expect(ms).toBeGreaterThan(3000);
    expect(ms).toBeLessThan(4000);
  });
  it("accepts a real browser recording through the server validator", async () => {
    await expect(validateAudioDuration(clip, "audio/webm")).resolves.toBeGreaterThan(3000);
  });
  it("returns no duration for bytes without timed blocks", () => {
    expect(webmDurationMs(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x80]))).toBeUndefined();
    expect(webmDurationMs(clip.subarray(0, 40))).toBeUndefined();
  });
});
