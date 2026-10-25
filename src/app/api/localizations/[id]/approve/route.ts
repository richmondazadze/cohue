import { LocalizedTextSchema } from "@/contracts";
import { route } from "@/server/http/route";
import { approveLocalization, assertLocalizationSource } from "@/server/domain/media";
import { inTx } from "@/server/http/tx";

export const POST = route("approveLocalization", (ctx) => inTx(ctx, (tx) => approveLocalization(tx, ctx.session!, ctx.params.id, ctx.input)), {
  replay: async (stored, ctx) => {
    await assertLocalizationSource(ctx.session!, ctx.params.id, ctx.tx ?? undefined);
    return LocalizedTextSchema.parse(stored);
  },
});
