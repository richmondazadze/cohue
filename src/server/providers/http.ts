import "server-only";
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
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiFailure") throw error;
    console.error(`${provider} request failed`, error instanceof Error ? error.name : "unknown");
    return fail("PROVIDER_UNAVAILABLE", `${provider} is unavailable right now; use the text path.`);
  } finally {
    clearTimeout(timer);
  }
}
