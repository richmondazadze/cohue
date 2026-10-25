import { route } from "@/server/http/route";
import { directorRequirements } from "@/server/domain/extraction";
import { loadOwnedMission } from "@/server/domain/missions/service";
import { fail } from "@/server/http/errors";

// Director draft for an owned mission; requirements still need the creator's confirmation via updateMission.
export const POST = route("parseMission", async (ctx) => {
  const mission = await loadOwnedMission(ctx.params.id, ctx.session!);
  if (mission.version !== ctx.input.expectedVersion) fail("STALE_VERSION", "Mission changed since you loaded it.");
  return directorRequirements(ctx.input.text, ctx.input.language);
});
