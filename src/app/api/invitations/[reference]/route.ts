import { route } from "@/server/http/route";
import { preview } from "@/server/domain/invitations";

export const GET = route("previewInvitation", (ctx) => preview(ctx.params.token));
