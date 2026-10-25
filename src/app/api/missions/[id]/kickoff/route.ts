import { route } from "@/server/http/route";
import { kickoffPlan } from "@/server/domain/kickoff";

export const GET = route("kickoffPlan", (ctx) => kickoffPlan(ctx.session, ctx.invite, ctx.params.id, ctx.input.language));
