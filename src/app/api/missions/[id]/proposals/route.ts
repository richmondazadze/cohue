import { route } from "@/server/http/route";
import { proposals } from "@/server/domain/missions/service";

export const GET = route("proposals", (ctx) => proposals(ctx.session!, ctx.params.id));
