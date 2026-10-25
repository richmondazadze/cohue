import { route } from "@/server/http/route";
import { randomUUID } from "node:crypto";
import { EXECUTION_POLICY } from "@/contracts";
import { createSessionRecord, GUEST_COOKIE, toSessionDto } from "@/server/auth/sessions";
import { fail } from "@/server/http/errors";
import { inTx } from "@/server/http/tx";

// LIVE guests only; showcase sessions require a server-installed scenario, none of which is installed yet.
export const POST = route("createSession", async (ctx) => {
  if (ctx.input.executionMode !== "LIVE") fail("SCOPE_MISMATCH", "Showcase sessions are limited to installed scenarios.");
  const expiresAt = new Date(Date.now() + EXECUTION_POLICY.guestSessionTtlHours * 3600_000);
  const { token, session } = await inTx(ctx, (tx) =>
    createSessionRecord(tx, { kind: "GUEST", principalId: randomUUID(), scope: ctx.input, invitationId: null, expiresAt }),
  );
  ctx.cookies.push({ name: GUEST_COOKIE, value: token, expires: expiresAt });
  return toSessionDto(session);
});
