import { route } from "@/server/http/route";
import { recover } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";
import { kick } from "@/server/runner/kick";

export const POST = route("retryMission", async (ctx) => {
  const result = await inTx(ctx, (tx) => recover(tx, ctx.session!, ctx.params.id, ctx.input.expectedVersion, ctx.input.checkpointId, "retry", ctx.correlationId));
  kick();
  return result;
});
