import { route } from "@/server/http/route";
import { approveLocalization } from "@/server/domain/media";
import { inTx } from "@/server/http/tx";

export const POST = route("approveLocalization", (ctx) => inTx(ctx, (tx) => approveLocalization(tx, ctx.session!, ctx.params.id, ctx.input)));
