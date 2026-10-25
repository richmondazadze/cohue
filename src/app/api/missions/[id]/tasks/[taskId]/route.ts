import { route } from "@/server/http/route";
import { updateTask } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const PATCH = route("updateTask", (ctx) =>
  inTx(ctx, (tx) => updateTask(tx, ctx.session, ctx.invite, ctx.params.id, ctx.params.taskId, ctx.input.expectedVersion, ctx.input.status, ctx.correlationId)),
);
