import { route } from "@/server/http/route";
import { providerUnavailable } from "@/server/providers/status";

// Provider-backed; returns PROVIDER_UNAVAILABLE until the account is configured and probed (no fixture fallback).
export const POST = route("transcribe", async () => providerUnavailable("transcribe"));
