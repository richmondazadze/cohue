import { route } from "@/server/http/route";
import { updateMission } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const PATCH = route("updateMission", (ctx) => inTx(ctx, (tx) => updateMission(tx, ctx.session!, ctx.params.id, ctx.input, ctx.correlationId)));
