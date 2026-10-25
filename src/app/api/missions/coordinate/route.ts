import { route } from "@/server/http/route";
import { coordinatorTurn } from "@/server/domain/extraction";

// Review-only, stateless conversation turn for the composer; the creator still confirms every field before createMission.
export const POST = route("coordinateMission", (ctx) => coordinatorTurn(ctx.input.turns, ctx.input.language, ctx.session!.principalId));
