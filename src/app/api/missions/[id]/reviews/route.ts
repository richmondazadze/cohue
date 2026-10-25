import { route } from "@/server/http/route";
import { requestReview } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const POST = route("requestReview", (ctx) => inTx(ctx, (tx) => requestReview(tx, ctx.session, ctx.invite, ctx.params.id, ctx.input, ctx.correlationId)));
