import { AudioArtifactSchema } from "@/contracts";
import { route } from "@/server/http/route";
import { synthesize, mediaFor } from "@/server/domain/media";
import { inTx } from "@/server/http/tx";

export const POST = route("synthesize", (ctx) => inTx(ctx, (tx) => synthesize(tx, (ctx.session ?? ctx.invite)!, ctx.input)), {
  acceptInvite: true,
  replay: async (stored, ctx) => (await mediaFor((ctx.session ?? ctx.invite)!, AudioArtifactSchema.parse(stored).id)).doc,
});
