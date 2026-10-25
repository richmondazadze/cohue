import { route } from "@/server/http/route";
import { extractProfile } from "@/server/domain/extraction";

// Review-only, stateless: nothing is persisted until the person confirms and creates the profile.
export const POST = route("parseProfile", (ctx) => extractProfile(ctx.input.text, ctx.input.language));
