import { route } from "@/server/http/route";
import { synthesize } from "@/server/domain/media";
import { inTx } from "@/server/http/tx";

export const POST = route("synthesize", (ctx) => inTx(ctx, (tx) => synthesize(tx, (ctx.session ?? ctx.invite)!, ctx.input)), { acceptInvite: true });
