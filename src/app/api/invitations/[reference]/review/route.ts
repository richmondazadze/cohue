import { route } from "@/server/http/route";
import { reviewDetail } from "@/server/domain/invitations";

export const GET = route("getInvitationForReview", (ctx) => reviewDetail(ctx.session!, ctx.params.id));
