import { route } from "@/server/http/route";
import { snapshot } from "@/server/domain/missions/service";

export const GET = route("snapshot", (ctx) => snapshot(ctx.session!, ctx.params.id));
