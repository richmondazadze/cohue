import { route } from "@/server/http/route";
import { redeem } from "@/server/domain/invitations";
import { inTx } from "@/server/http/tx";

export const POST = route("redeemInvitation", (ctx) => inTx(ctx, (tx) => redeem(tx, ctx.params.token, ctx.cookies)));
