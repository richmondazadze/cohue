import { route } from "@/server/http/route";
import { fail } from "@/server/http/errors";

// No audio artifact can exist until speech providers are configured; every lookup is a scoped miss.
export const GET = route("media", async () => fail("NOT_FOUND", "Media not found."));
