import { route } from "@/server/http/route";
import { createParticipant } from "@/server/domain/participants";
import { inTx } from "@/server/http/tx";

export const POST = route("createParticipant", (ctx) => inTx(ctx, (tx) => createParticipant(tx, ctx.session!, ctx.input)));
