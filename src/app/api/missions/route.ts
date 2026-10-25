import { route } from "@/server/http/route";
import { createMission } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const POST = route("createMission", (ctx) => inTx(ctx, (tx) => createMission(tx, ctx.session!, ctx.input, ctx.correlationId)));
