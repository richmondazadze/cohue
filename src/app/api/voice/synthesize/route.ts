import { AudioArtifactSchema } from "@/contracts";
import { route } from "@/server/http/route";
import { synthesize, mediaFor, prepareSpeech } from "@/server/domain/media";
import { inTx } from "@/server/http/tx";

export const POST = route("synthesize", (ctx) => inTx(ctx, (tx) => synthesize(tx, (ctx.session ?? ctx.invite)!, ctx.input, ctx.prepared as Awaited<ReturnType<typeof prepareSpeech>>)), {
  acceptInvite: true,
  prepare: (ctx) => prepareSpeech((ctx.session ?? ctx.invite)!, ctx.input),
  replay: async (stored, ctx) => (await mediaFor((ctx.session ?? ctx.invite)!, AudioArtifactSchema.parse(stored).id)).doc,
});
