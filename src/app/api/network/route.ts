import { route } from "@/server/http/route";
import { network } from "@/server/domain/participants";
import { LIVE } from "@/server/http/scope";

// Public network is LIVE only; a showcase session reads only its own scenario.
export const GET = route("network", (ctx) => network(ctx.session?.scope ?? LIVE, ctx.input.limit));
