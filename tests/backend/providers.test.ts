import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { providerFetch, providerJson } from "@/server/providers/http";

afterEach(() => vi.unstubAllGlobals());

describe("provider trust boundary", () => {
  it("validates successful transport bodies without exposing raw provider content", async () => {
    await expect(providerJson(new Response(JSON.stringify({ text: 42, secret: "private-provider-content" })), z.object({ text: z.string() }), "Test"))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(providerJson(new Response("not-json"), z.object({ text: z.string() }), "Test"))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(providerJson(new Response('{"text":"review me","ignored":"extra"}'), z.object({ text: z.string() }), "Test"))
      .resolves.toEqual({ text: "review me" });
  });

  it("rejects oversized provider bodies before parsing or storing them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array(4_000_001))));
    await expect(providerFetch("Test", "https://example.test", {})).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("maps quota errors to a safe typed error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret upstream error", { status: 429 })));
    await expect(providerFetch("Test", "https://example.test", {})).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
