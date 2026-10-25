import { route } from "@/server/http/route";
import { randomUUID } from "node:crypto";
import { EXECUTION_POLICY } from "@/contracts";
import { createSessionRecord, GUEST_COOKIE, resolveSession, toSessionDto } from "@/server/auth/sessions";
import { fail } from "@/server/http/errors";
import { inTx } from "@/server/http/tx";
import { INSTALLED_SHOWCASES } from "@/server/domain/showcase";

// While a browser explores the showcase, its LIVE guest token is parked here (HttpOnly, same lifetime),
// so "Return to live mode" restores the same principal and its profile instead of minting a stranger.
const PARKED_LIVE_COOKIE = "cohue_live";
const expired = new Date(0);

// LIVE guests keep one principal per browser; showcase sessions exist only for server-installed scenarios
// and act as that scenario's operator, whose scripted decisions still go through the same command handlers.
export const POST = route("createSession", async (ctx) => {
  const showcase = ctx.input.executionMode === "SHOWCASE" ? INSTALLED_SHOWCASES[ctx.input.showcaseId] : undefined;
  if (ctx.input.executionMode === "SHOWCASE" && !showcase) fail("SCOPE_MISMATCH", "Showcase sessions are limited to installed scenarios.");
  const currentToken = ctx.request.cookies.get(GUEST_COOKIE)?.value;
  const parkedToken = ctx.request.cookies.get(PARKED_LIVE_COOKIE)?.value;
  const current = ctx.session;

  if (!showcase) {
    // Already live: return the same session rather than replacing the principal.
    if (current && current.scope.executionMode === "LIVE") return toSessionDto(current);
    const parked = await resolveSession(parkedToken);
    if (parked && parked.kind === "GUEST" && parked.scope.executionMode === "LIVE") {
      ctx.cookies.push({ name: GUEST_COOKIE, value: parkedToken!, expires: parked.expiresAt });
      ctx.cookies.push({ name: PARKED_LIVE_COOKIE, value: "", expires: expired });
      return toSessionDto(parked);
    }
  } else if (current && current.kind === "GUEST" && current.scope.executionMode === "LIVE" && currentToken) {
    ctx.cookies.push({ name: PARKED_LIVE_COOKIE, value: currentToken, expires: current.expiresAt });
  }

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
  if (!showcase) ctx.cookies.push({ name: PARKED_LIVE_COOKIE, value: "", expires: expired });
  return toSessionDto(session);
});
