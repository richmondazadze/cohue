import "server-only";
import { randomUUID } from "node:crypto";
import type { Scope } from "@/contracts";
import { query, type Tx } from "../db/client";
import { newToken, tokenHash } from "../http/crypto";
import { scopeColumns, scopeFromRow } from "../http/scope";

export const GUEST_COOKIE = "cohue_session";
export const INVITE_COOKIE = "cohue_invite";
export type SessionKind = "GUEST" | "INVITATION" | "SHOWCASE_OPERATOR";
export type SessionRecord = {
  id: string;
  kind: SessionKind;
  principalId: string;
  scope: Scope;
  invitationId: string | null;
  expiresAt: Date;
};
type Row = {
  id: string;
  kind: SessionKind;
  principal_id: string;
  scope_mode: string;
  showcase_id: string;
  invitation_id: string | null;
  expires_at: Date;
};

export async function resolveSession(token: string | undefined): Promise<SessionRecord | null> {
  if (!token || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) return null;
  const [row] = await query<Row>(
    `SELECT id, kind, principal_id, scope_mode, showcase_id, invitation_id, expires_at FROM sessions
     WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash(token)],
  );
  return row
    ? {
        id: row.id,
        kind: row.kind,
        principalId: row.principal_id,
        scope: scopeFromRow(row),
        invitationId: row.invitation_id,
        expiresAt: row.expires_at,
      }
    : null;
}

// Plaintext token is returned once for the cookie; only its keyed hash is stored.
export async function createSessionRecord(
  tx: Tx,
  input: { kind: SessionKind; principalId: string; scope: Scope; invitationId: string | null; expiresAt: Date },
): Promise<{ token: string; session: SessionRecord }> {
  const token = newToken();
  const id = randomUUID();
  const [mode, showcase] = scopeColumns(input.scope);
  await tx.query(
    `INSERT INTO sessions(id, token_hash, kind, principal_id, scope_mode, showcase_id, invitation_id, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,now(),$8)`,
    [id, tokenHash(token), input.kind, input.principalId, mode, showcase, input.invitationId, input.expiresAt],
  );
  return { token, session: { id, ...input } };
}

export const toSessionDto = (s: SessionRecord) => ({
  principalId: s.principalId,
  kind: s.kind,
  scope: s.scope,
  invitationId: s.invitationId,
  expiresAt: iso(s.expiresAt),
});
export const iso = (d: Date | string): string => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
