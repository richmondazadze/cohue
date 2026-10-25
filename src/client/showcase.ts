import { callApi, ApiRequestError, type ApiData } from "./http";
import { writeDeviceMemory } from "./local";

export const SHOWCASE_ID = "00000000-0000-4000-8000-000000000384";
// Installed scenario's first profile is also the server's earliest owned organizer profile.
const SHOWCASE_CREATOR_ID = "00000000-0000-4000-8000-000000000001";

export async function prepareShowcaseProfile(session: ApiData<"getSession">) {
  if (session.kind !== "SHOWCASE_OPERATOR" || session.scope.executionMode !== "SHOWCASE" || session.scope.showcaseId !== SHOWCASE_ID)
    throw new ApiRequestError({ operation: "getParticipant", code: "SCOPE_MISMATCH", message: "Open the installed synthetic showcase first.", status: null, retryable: false });
  // A real authorized read proves the profile exists. No fixture fallback or automatic consent.
  const profile = await callApi("getParticipant", { params: { id: SHOWCASE_CREATOR_ID } });
  if (profile.scope.executionMode !== "SHOWCASE" || profile.scope.showcaseId !== SHOWCASE_ID)
    throw new ApiRequestError({ operation: "getParticipant", code: "SCOPE_MISMATCH", message: "Synthetic profile belongs to a different showcase.", status: null, retryable: false });
  writeDeviceMemory((m) => ({ ...m, participantId: profile.id }), session);
  return profile;
}
