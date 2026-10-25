import "server-only";
import { EXECUTION_POLICY } from "@/contracts";
import { query, type Tx } from "../db/client";
import { fail } from "../http/errors";
import { hmac, tokenHash } from "../http/crypto";
import { scopeFromRow } from "../http/scope";
import { createSessionRecord, iso, INVITE_COOKIE, type SessionRecord } from "../auth/sessions";
import { invitationDto, principalParticipantIds, type InvitationRow, type MissionRow } from "./store";
import type { CookieWrite } from "../http/route";
import { localizeInvitation, authorizedInvitationSource } from "./media";

const TERMINAL = new Set(["CANCELLED", "EXPIRED"]);
// Token derived from (invitation, epoch) so replay recomputes it; only its keyed hash is stored.
export const linkToken = (invitationId: string, epoch: number) => hmac("cohue-invitation-link-v1", `${invitationId}:${epoch}`);

async function usable(tx: Tx, row: InvitationRow) {
  const [mission] = await query<MissionRow>("SELECT state FROM missions WHERE id=$1", [row.mission_id], tx);
  if (TERMINAL.has(mission.state)) fail("TERMINAL_MISSION", `Mission is ${mission.state.toLowerCase()}.`);
  if (row.status === "REVOKED") fail("INVITATION_REVOKED", "This invitation was replaced or withdrawn.");
  if (row.status === "EXPIRED" || row.expires_at < new Date()) fail("INVITATION_EXPIRED", "This invitation has expired.");
}

// OWNER = mission creator, or the invited participant acting from their own profile session.
export async function issueLink(tx: Tx, session: SessionRecord, invitationId: string, rotate: boolean) {
  const [row] = await query<InvitationRow & { owner_principal_id: string }>(
    `SELECT i.*, m.owner_principal_id FROM invitations i JOIN missions m ON m.id=i.mission_id WHERE i.id=$1 FOR UPDATE OF i`,
    [invitationId],
    tx,
  );
  if (!row || scopeFromRow(row).executionMode !== session.scope.executionMode) fail("NOT_FOUND", "Invitation not found.");
  const mine = await principalParticipantIds(session.principalId, session.scope, tx);
  if (row.owner_principal_id !== session.principalId && !mine.includes(row.participant_id)) fail("NOT_FOUND", "Invitation not found.");
  await usable(tx, row);
  if (row.status !== "PENDING") fail("STALE_VERSION", "This invitation already has a response.");
  const epoch = rotate || row.link_epoch === 0 ? row.link_epoch + 1 : row.link_epoch;
  const token = linkToken(row.id, epoch);
  if (epoch !== row.link_epoch)
    await tx.query("UPDATE invitations SET link_epoch=$2, token_hash=$3 WHERE id=$1", [row.id, epoch, tokenHash(token)]);
  return { invitationId: row.id, token, linkEpoch: epoch, expiresAt: iso(row.expires_at) };
}

async function byToken(token: string, client?: Tx): Promise<InvitationRow> {
  const [row] = await query<InvitationRow>("SELECT * FROM invitations WHERE token_hash=$1", [tokenHash(token)], client);
  if (!row || linkToken(row.id, row.link_epoch) !== token) fail("NOT_FOUND", "This link is not valid.");
  return row;
}

// Public, non-consuming: language, expiry and availability only, no terms or identities.
export async function preview(token: string) {
  const row = await byToken(token);
  const [mission] = await query<{ state: string }>("SELECT state FROM missions WHERE id=$1", [row.mission_id]);
  return {
    invitationId: row.id,
    language: row.language,
    expiresAt: iso(row.expires_at),
    accessNotice: "BEARER_LINK_ONE_INVITATION" as const,
    available: row.status === "PENDING" && row.expires_at > new Date() && !TERMINAL.has(mission.state),
  };
}

// Explicit redemption creates a session bound to exactly this invitation and scope.
export async function redeem(tx: Tx, token: string, cookies: CookieWrite[]) {
  const row = await byToken(token, tx);
  await usable(tx, row);
  const expires = new Date(Math.min(row.expires_at.getTime(), Date.now() + EXECUTION_POLICY.invitationSessionTtlHours * 3600_000));
  const { token: sessionToken, session } = await createSessionRecord(tx, {
    kind: "INVITATION",
    principalId: row.participant_id,
    scope: scopeFromRow(row),
    invitationId: row.id,
    expiresAt: expires,
  });
  cookies.push({ name: INVITE_COOKIE, value: sessionToken, expires });
  return {
    session: { principalId: session.principalId, kind: session.kind, scope: session.scope, invitationId: session.invitationId, expiresAt: iso(expires) },
    invitation: invitationDto(row),
  };
}

export async function detail(invite: SessionRecord, invitationId: string) {
  if (invite.invitationId !== invitationId) fail("FORBIDDEN", "This session is bound to a different invitation.");
  const row = await authorizedInvitationSource(invite, invitationId);
  return { invitation: invitationDto(row), localized: await localizeInvitation(row, row.doc.language) };
}

// Separate creator read; narrow bearer sessions never inherit this authority.
export async function reviewDetail(session: SessionRecord, invitationId: string) {
  const row = await authorizedInvitationSource(session, invitationId, undefined, true);
  return { invitation: invitationDto(row), localized: await localizeInvitation(row, row.doc.language) };
}
