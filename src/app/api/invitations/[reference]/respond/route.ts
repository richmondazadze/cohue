import { route } from "@/server/http/route";
import { respond } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";
import { kick } from "@/server/runner/kick";

export const POST = route("respondInvitation", async (ctx) => {
  const result = await inTx(ctx, (tx) => respond(tx, ctx.invite!, ctx.params.id, ctx.input, ctx.correlationId));
  kick();
  return result;
});
