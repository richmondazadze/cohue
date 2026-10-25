import { route } from "@/server/http/route";
import { detail } from "@/server/domain/invitations";

export const GET = route("getInvitation", (ctx) => detail(ctx.invite!, ctx.params.id));
