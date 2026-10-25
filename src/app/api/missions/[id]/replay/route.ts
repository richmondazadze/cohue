import { route } from "@/server/http/route";
import { replay } from "@/server/domain/missions/replay";

export const GET = route("replay", (ctx) => replay(ctx.session!, ctx.params.id, ctx.input.atSequence));
