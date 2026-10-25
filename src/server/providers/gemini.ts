import "server-only";
import { z } from "zod";
import { env } from "../config/env";
import { fail } from "../http/errors";
import { providerFetch, providerJson } from "./http";

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
  /** Total budget; interactive callers with a fallback model pass a shorter one. */
  budgetMs?: number;
}): Promise<T> {
  const key = env().GEMINI_API_KEY;
  const model = env().GEMINI_MODEL;
  if (!key || !model) fail("PROVIDER_UNAVAILABLE", "Language model is not configured; use the manual form.");
  const attempts = input.attempts ?? 2;
  const deadline = Date.now() + (input.budgetMs ?? 35_000);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
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
            // Reviewed extraction/translation needs low latency, not extended hidden reasoning.
            ...(model!.startsWith("gemini-3") || model!.startsWith("gemini-4")
              ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
          },
        }),
      },
      Math.min(20_000, remaining),
    );
    const body = await providerJson(response, z.object({
      candidates: z.array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })).max(100) }).optional() })).max(10).optional(),
    }), "Gemini");
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
