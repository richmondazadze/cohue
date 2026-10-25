import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "@/client/voice";

const key = "ui-1234567890abcdef";
const metadata = { purpose: "MISSION", language: "en", mimeType: "audio/wav", sizeBytes: 4, durationMs: 1000 } as const;
afterEach(() => vi.unstubAllGlobals());

describe("transcription transport lifecycle", () => {
  it("uses multipart metadata and passes navigation cancellation to the real transport boundary", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal);
      const form = init.body as FormData;
      expect(JSON.parse(String(form.get("metadata")))).toMatchObject({ purpose: "MISSION", language: "en", durationMs: 1000 });
      expect(form.get("audio")).toBeInstanceOf(Blob);
      expect((init.headers as Record<string, string>)["idempotency-key"]).toBe(key);
      return { status: 200, json: async () => ({ data: { transcript: "Synthetic repair mission", language: "en", status: "REVIEW_REQUIRED", rawAudioDeleted: true }, correlationId: "00000000-0000-4000-8000-000000000001" }) };
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(transcribeAudio(new Blob(["RIFF"]), metadata, key, controller.signal)).resolves.toMatchObject({ transcript: "Synthetic repair mission", status: "REVIEW_REQUIRED" });
  });
  it("keeps abort distinct from a retryable provider/network failure", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn(() => new Promise((_resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(new DOMException("Navigation", "AbortError")));
    })));
    const result = transcribeAudio(new Blob(["RIFF"]), metadata, key, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects out-of-contract audio metadata without a provider request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(transcribeAudio(new Blob(["RIFF"]), { ...metadata, durationMs: 60001 }, key)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
