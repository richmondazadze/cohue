import type { Scope } from "@/contracts";

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";
export const LIVE: Scope = { executionMode: "LIVE", showcaseId: null };
export const scopeColumns = (scope: Scope): [string, string] => [
  scope.executionMode,
  scope.showcaseId ?? NIL_UUID,
];
export const scopeFromRow = (row: { scope_mode: string; showcase_id: string }): Scope =>
  row.scope_mode === "SHOWCASE"
    ? { executionMode: "SHOWCASE", showcaseId: row.showcase_id }
    : LIVE;
export const sameScope = (a: Scope, b: Scope): boolean =>
  a.executionMode === b.executionMode && a.showcaseId === b.showcaseId;
