import "server-only";
import { env } from "../config/env";
import { query } from "../db/client";
import { fail } from "../http/errors";

export function providerUnavailable(operation: string): never {
  return fail("PROVIDER_UNAVAILABLE", `${operation} needs a configured provider account; use the text path.`);
}

// Redacted operator view: states only, never keys, models, balances or raw errors.
export async function providerHealth() {
  const e = env();
  let database: "UNCONFIGURED" | "READY" | "DEGRADED" = "UNCONFIGURED";
  if (e.DATABASE_URL)
    database = await query("SELECT 1").then(
      () => "READY" as const,
      () => "DEGRADED" as const,
    );
  return {
    database,
    dispatcher: e.DISPATCHER_SECRET && e.DISPATCHER_MODE ? ("UNVERIFIED" as const) : ("UNCONFIGURED" as const),
    gemini: e.GEMINI_API_KEY && e.GEMINI_MODEL ? ("DEGRADED" as const) : ("UNCONFIGURED" as const),
    elevenlabs: e.ELEVENLABS_API_KEY && e.ELEVENLABS_VOICE_ID ? ("DEGRADED" as const) : ("UNCONFIGURED" as const),
    serpapi: e.SERPAPI_API_KEY ? ("DEGRADED" as const) : ("UNCONFIGURED" as const),
  };
}
