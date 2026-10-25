import { route } from "@/server/http/route";
import { randomUUID } from "node:crypto";
import { EXECUTION_POLICY } from "@/contracts";
import { createSessionRecord, GUEST_COOKIE, toSessionDto } from "@/server/auth/sessions";
import { fail } from "@/server/http/errors";
import { inTx } from "@/server/http/tx";
import { INSTALLED_SHOWCASES } from "@/server/domain/showcase";

// LIVE guests get a fresh principal; showcase sessions exist only for server-installed scenarios and act as
// that scenario's operator, whose scripted decisions still go through the same command handlers.
export const POST = route("createSession", async (ctx) => {
  const showcase = ctx.input.executionMode === "SHOWCASE" ? INSTALLED_SHOWCASES[ctx.input.showcaseId] : undefined;
  if (ctx.input.executionMode === "SHOWCASE" && !showcase) fail("SCOPE_MISMATCH", "Showcase sessions are limited to installed scenarios.");
  const expiresAt = new Date(Date.now() + EXECUTION_POLICY.guestSessionTtlHours * 3600_000);
  const { token, session } = await inTx(ctx, (tx) =>
    createSessionRecord(tx, {
      kind: showcase ? "SHOWCASE_OPERATOR" : "GUEST",
      principalId: showcase ? showcase.operatorPrincipalId : randomUUID(),
      scope: ctx.input,
      invitationId: null,
      expiresAt,
    }),
  );
  ctx.cookies.push({ name: GUEST_COOKIE, value: token, expires: expiresAt });
  return toSessionDto(session);
});
