import "server-only";
import type { z } from "zod";
import { env } from "../config/env";
import { fail } from "../http/errors";
import { providerFetch } from "./http";

export const geminiConfigured = () => Boolean(env().GEMINI_API_KEY && env().GEMINI_MODEL);

// Structured JSON generation: the response must pass the Zod schema AND the caller's semantic check.
// Model output never authorizes consent, capacity or feasibility; it only drafts reviewable text.
export async function generateJson<T>(input: {
  system: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  validate: z.ZodType<T>;
  semantic?: (value: T) => string | null;
  attempts?: number;
}): Promise<T> {
  const key = env().GEMINI_API_KEY;
  const model = env().GEMINI_MODEL;
  if (!key || !model) fail("PROVIDER_UNAVAILABLE", "Language model is not configured; use the manual form.");
  const attempts = input.attempts ?? 2;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await providerFetch(
      "Gemini",
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model!)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.prompt.slice(0, 8000) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: input.responseSchema,
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      },
    );
    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      continue;
    }
    const parsed = input.validate.safeParse(raw);
    if (!parsed.success) continue;
    const problem = input.semantic?.(parsed.data);
    if (problem) continue;
    return parsed.data;
  }
  return fail("PROVIDER_UNAVAILABLE", "The language model returned unusable output; use the manual form.");
}
