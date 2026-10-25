import "server-only";
import { z } from "zod";
import { env } from "../config/env";
import { fail } from "../http/errors";
import { providerFetch, providerJson } from "./http";

// Meta Model API (Muse Spark), OpenAI-compatible Chat Completions with schema-constrained JSON output.
const BASE = "https://api.meta.ai/v1";
export const metaConfigured = () => Boolean(env().META_MODEL_API_KEY);
export const metaModel = () => env().META_MODEL ?? "muse-spark-1.3";

/** Gemini-style schema (OBJECT/STRING, nullable) to standard JSON Schema. */
export function toJsonSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toJsonSchema);
  if (!s || typeof s !== "object") return s;
  const out: Record<string, unknown> = {};
  const src = s as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    if (k === "nullable") continue;
    if (k === "type" && typeof v === "string") out.type = src.nullable ? [v.toLowerCase(), "null"] : v.toLowerCase();
    else if (k === "properties" && v && typeof v === "object")
      out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toJsonSchema(pv)]));
    else out[k] = toJsonSchema(v);
  }
  return out;
}

export async function metaGenerateJson<T>(input: {
  system: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  validate: z.ZodType<T>;
  semantic?: (value: T) => string | null;
  timeoutMs?: number;
}): Promise<T> {
  const key = env().META_MODEL_API_KEY;
  if (!key) fail("PROVIDER_UNAVAILABLE", "The Meta model is not configured.");
  const response = await providerFetch(
    "Meta Model API",
    `${BASE}/chat/completions`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: metaModel(),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt.slice(0, 8000) },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_schema", json_schema: { name: "result", schema: toJsonSchema(input.responseSchema) } },
      }),
    },
    input.timeoutMs ?? 20_000,
  );
  const body = await providerJson(
    response,
    z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().nullable().optional() }) })).max(10) }),
    "Meta Model API",
  );
  let raw: unknown;
  try {
    raw = JSON.parse(body.choices[0]?.message.content ?? "");
  } catch {
    return fail("PROVIDER_UNAVAILABLE", "The Meta model returned unusable output.");
  }
  const parsed = input.validate.safeParse(raw);
  if (!parsed.success || input.semantic?.(parsed.data)) fail("PROVIDER_UNAVAILABLE", "The Meta model returned unusable output.");
  return parsed.data!;
}
