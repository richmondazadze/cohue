import { route } from "@/server/http/route";
import { deleteParticipant, loadOwnedParticipant, updateParticipant } from "@/server/domain/participants";
import { participantDto } from "@/server/domain/store";
import { inTx } from "@/server/http/tx";
import { kick } from "@/server/runner/kick";

export const GET = route("getParticipant", async (ctx) => participantDto(await loadOwnedParticipant(ctx.params.id, ctx.session!)));
export const PATCH = route("updateParticipant", async (ctx) => {
  const result = await inTx(ctx, (tx) => updateParticipant(tx, ctx.session!, ctx.params.id, ctx.input.expectedVersion, ctx.input.profile, ctx.correlationId));
  kick();
  return result;
});
export const DELETE = route("deleteParticipant", async (ctx) => {
  const result = await inTx(ctx, (tx) => deleteParticipant(tx, ctx.session!, ctx.params.id, ctx.input.expectedVersion, ctx.correlationId));
  kick();
  return result;
});
