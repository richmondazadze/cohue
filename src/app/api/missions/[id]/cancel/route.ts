import { route } from "@/server/http/route";
import { cancel } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const POST = route("cancelMission", (ctx) => inTx(ctx, (tx) => cancel(tx, ctx.session!, ctx.params.id, ctx.input.expectedVersion, ctx.correlationId)));
