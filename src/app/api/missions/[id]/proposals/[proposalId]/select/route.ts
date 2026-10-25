import { route } from "@/server/http/route";
import { selectProposal } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const POST = route("selectProposal", (ctx) =>
  inTx(ctx, (tx) => selectProposal(tx, ctx.session!, ctx.params.id, ctx.params.proposalId, ctx.input.expectedVersion, ctx.input.proposalRevision, ctx.correlationId)),
);
