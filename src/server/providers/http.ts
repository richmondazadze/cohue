import "server-only";
import type { z } from "zod";
import { fail } from "../http/errors";

// Bounded provider fetch: timeout, no secret in errors, typed PROVIDER_UNAVAILABLE on failure.
export async function providerFetch(
  provider: string,
  url: string,
  init: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (response.status === 429) fail("RATE_LIMITED", `${provider} quota or rate limit reached.`);
    if (!response.ok) {
      console.error(`${provider} responded ${response.status}`);
      fail("PROVIDER_UNAVAILABLE", `${provider} is unavailable right now; use the text path.`);
    }
    // Keep the timeout active through body receipt, not only response headers.
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body?.getReader();
    if (reader) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > 4_000_000) {
            await reader.cancel();
            fail("PROVIDER_UNAVAILABLE", `${provider} returned an oversized response; use the text path.`);
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
    }
    return new Response(Buffer.concat(chunks, total), { status: response.status, headers: response.headers });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiFailure") throw error;
    console.error(`${provider} request failed`, error instanceof Error ? error.name : "unknown");
    return fail("PROVIDER_UNAVAILABLE", `${provider} is unavailable right now; use the text path.`);
  } finally {
    clearTimeout(timer);
  }
}

// Treat provider payloads as untrusted even when transport succeeds. Never expose their raw body.
export async function providerJson<T>(response: Response, schema: z.ZodType<T>, provider: string): Promise<T> {
  try {
    const parsed = schema.safeParse(await response.json());
    if (parsed.success) return parsed.data;
  } catch {}
  return fail("PROVIDER_UNAVAILABLE", `${provider} returned an invalid response; use the text path.`);
}
