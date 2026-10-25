import { route } from "@/server/http/route";
import { startMission } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";
import { kick } from "@/server/runner/kick";

export const POST = route("startMission", async (ctx) => {
  const result = await inTx(ctx, (tx) => startMission(tx, ctx.session!, ctx.params.id, ctx.input.expectedVersion));
  kick();
  return result;
});
