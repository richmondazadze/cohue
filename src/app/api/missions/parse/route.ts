import { route } from "@/server/http/route";
import { extractMissionDraft } from "@/server/domain/extraction";

// Review-only, stateless draft for the composer; the creator confirms every field before createMission.
export const POST = route("extractMission", (ctx) => extractMissionDraft(ctx.input.text, ctx.input.language));
