import "server-only";
import { z } from "zod";
import { env } from "../config/env";
import { providerFetch, providerJson } from "./http";

export type SearchHit = { title: string; link: string; snippet: string; searchId: string };
export const serpConfigured = () => Boolean(env().SERPAPI_API_KEY);

// One bounded web search; results are public, unverified evidence, never participants.
export async function webSearch(query: string, language: string): Promise<SearchHit[]> {
  const key = env().SERPAPI_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    engine: "google",
    q: query.slice(0, 300),
    hl: language.split("-")[0],
    num: "6",
    api_key: key,
  });
  const response = await providerFetch("SerpApi", `https://serpapi.com/search.json?${params}`, { method: "GET" }, 12_000);
  const body = await providerJson(response, z.object({
    search_metadata: z.object({ id: z.string().min(1).max(200) }).optional(),
    organic_results: z.array(z.object({
      title: z.string().max(10_000).optional(),
      link: z.string().url().max(10_000).optional(),
      snippet: z.string().max(100_000).optional(),
    })).max(100).optional(),
  }), "SerpApi");
  const searchId = body.search_metadata?.id ?? "unknown";
  return (body.organic_results ?? [])
    .filter((r) => r.title && r.link && /^https?:\/\//.test(r.link))
    .slice(0, 5)
    .map((r) => ({ title: r.title!.slice(0, 120), link: r.link!, snippet: (r.snippet ?? r.title!).slice(0, 2000), searchId }));
}
