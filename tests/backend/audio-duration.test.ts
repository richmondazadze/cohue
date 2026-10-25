import { describe, expect, it } from "vitest";
import { validateAudioDuration } from "@/server/domain/audio-duration";

function wav(seconds: number): Buffer {
  const rate = 8000;
  const dataBytes = Math.round(rate * 2 * seconds);
  const b = Buffer.alloc(44 + dataBytes);
  b.write("RIFF", 0); b.writeUInt32LE(36 + dataBytes, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(dataBytes, 40);
  return b;
}

describe("server measured recording duration", () => {
  it("accepts bounded PCM audio independently of client metadata", async () => {
    await expect(validateAudioDuration(wav(2), "audio/wav")).resolves.toBe(2000);
  });
  it("rejects overlong audio even though it fits the byte limit", async () => {
    const bytes = wav(61);
    expect(bytes.length).toBeLessThan(3_000_000);
    await expect(validateAudioDuration(bytes, "audio/wav")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("rejects malformed or durationless audio", async () => {
    await expect(validateAudioDuration(Buffer.from("RIFF no audio"), "audio/wav")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
