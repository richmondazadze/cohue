import { route } from "@/server/http/route";
import { activate } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const POST = route("activateMission", (ctx) =>
  inTx(ctx, (tx) => activate(tx, ctx.session!, ctx.params.id, ctx.input.expectedVersion, ctx.input.proposalRevision, ctx.correlationId)),
);
