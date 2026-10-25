import { route } from "@/server/http/route";
import { inbox } from "@/server/domain/participants";

export const GET = route("inbox", (ctx) => inbox(ctx.session!, ctx.params.id, ctx.input.limit, ctx.input.cursor));
