import { route } from "@/server/http/route";
import { providerHealth } from "@/server/providers/status";

export const GET = route("health", () => providerHealth());
