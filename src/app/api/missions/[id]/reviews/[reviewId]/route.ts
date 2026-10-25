import { route } from "@/server/http/route";
import { updateReview } from "@/server/domain/missions/service";
import { inTx } from "@/server/http/tx";

export const PATCH = route("updateReview", (ctx) => inTx(ctx, (tx) => updateReview(tx, ctx.session!, ctx.params.id, ctx.params.reviewId, ctx.input, ctx.correlationId)));
