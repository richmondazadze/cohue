import { route } from "@/server/http/route";
import { INITIAL_TAXONOMY } from "@/contracts";

export const GET = route("taxonomy", async () => INITIAL_TAXONOMY);
