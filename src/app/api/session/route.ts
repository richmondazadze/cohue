import { route } from "@/server/http/route";
import { toSessionDto } from "@/server/auth/sessions";

export const GET = route("getSession", async (ctx) => toSessionDto(ctx.session!));
