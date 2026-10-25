import { route } from "@/server/http/route";
import { issueLink, linkToken } from "@/server/domain/invitations";
import { inTx } from "@/server/http/tx";

type Stored = { invitationId: string; linkEpoch: number; expiresAt: string };
// The receipt keeps only the epoch; exact replay recomputes the same derived token.
export const POST = route(
  "issueInvitationLink",
  (ctx) => inTx(ctx, (tx) => issueLink(tx, ctx.session!, ctx.params.id, ctx.input.rotate)),
  {
    store: ({ invitationId, linkEpoch, expiresAt }) => ({ invitationId, linkEpoch, expiresAt }),
    replay: async (stored, ctx) => {
      // Receipt replay cannot restore revoked/deleted source authority.
      await inTx(ctx, (tx) => issueLink(tx, ctx.session!, ctx.params.id, false));
      const s = stored as Stored;
      return { ...s, token: linkToken(s.invitationId, s.linkEpoch) };
    },
  },
);
