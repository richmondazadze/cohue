import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiRequestError } from "@/client/http";
import { MissionRoom } from "@/features/room/room";
import { MissionTheater } from "@/features/theater/theater";
import { InvitationResponse } from "@/features/invitations/respond";

const state = vi.hoisted(() => ({ error: null as unknown }));
vi.mock("@/client/queries", () => {
  const deniedQuery = () => ({
    isPending: false, isError: true, error: state.error,
    // React Query retains a previous successful value after a failed background refetch.
    data: { privateSentinel: "PRIVATE_CACHED_CONTENT" },
    refetch: vi.fn(),
  });
  return {
    useRoom: deniedQuery, useSnapshot: deniedQuery, useInvitationDetail: deniedQuery,
    useMissionEvents: () => ({ revoked: false, events: [] }),
    keys: {}, TERMINAL_STATES: [],
  };
});
vi.mock("@/client/hydrated", () => ({ useHydrated: () => true }));

const id = "00000000-0000-4000-8000-000000000001";
const render = (view: ReactNode) => renderToStaticMarkup(
  createElement(QueryClientProvider, { client: new QueryClient() }, view),
);

describe("access revoked after a successful cached read", () => {
  for (const code of ["FORBIDDEN", "UNAUTHENTICATED", "NOT_FOUND", "SCOPE_MISMATCH"] as const) {
    it(`hides prior mission, room and invitation data on ${code}`, () => {
      state.error = new ApiRequestError({ operation: "snapshot", code, message: "Access changed", status: 403, retryable: false });
      for (const view of [createElement(MissionTheater, { missionId: id }), createElement(MissionRoom, { missionId: id }), createElement(InvitationResponse, { invitationId: id })]) {
        const html = render(view);
        expect(html).not.toContain("PRIVATE_CACHED_CONTENT");
        expect(html).toContain('role="alert"');
      }
    });
  }
});
