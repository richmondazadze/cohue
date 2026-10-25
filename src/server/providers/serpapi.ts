import "server-only";
import { env } from "../config/env";
import { providerFetch } from "./http";

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
  const body = (await response.json()) as {
    search_metadata?: { id?: string };
    organic_results?: { title?: string; link?: string; snippet?: string }[];
  };
  const searchId = body.search_metadata?.id ?? "unknown";
  return (body.organic_results ?? [])
    .filter((r) => r.title && r.link && /^https?:\/\//.test(r.link))
    .slice(0, 5)
    .map((r) => ({ title: r.title!.slice(0, 120), link: r.link!, snippet: (r.snippet ?? r.title!).slice(0, 2000), searchId }));
}
