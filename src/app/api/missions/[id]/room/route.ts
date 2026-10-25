import { route } from "@/server/http/route";
import { room } from "@/server/domain/missions/service";

export const GET = route("room", (ctx) => room(ctx.session, ctx.invite, ctx.params.id));
