import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvitationSchema, LocalizedTextSchema } from "@/contracts";
import { ApiRequestError, prepareRequest } from "@/client/http";
import { currentTranslations, Translations } from "@/features/invitations/translations";
import { CreatorInvitationReviewContent } from "@/features/invitations/creator-review";
import { fixtureId, fixtureTime, proposal, scope } from "../e2e/frontend/support/mock-data";

const state = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));
vi.mock("@/client/queries", async (original) => ({
  ...await original<typeof import("@/client/queries")>(),
  useInvitationReview: () => state.query,
}));
const inv = InvitationSchema.parse({ id: fixtureId(200), missionId: proposal.missionId, proposalId: proposal.id, proposalRevision: 1, participantId: proposal.members[0].participantId, scope, language: "en", status: "PENDING", terms: proposal.members[0].terms, termsHash: proposal.members[0].termsHash, responseVersion: 1, expiresAt: "2026-12-01T00:00:00Z", lineage: null });
const localized = (language = "es", status: "REVIEW_REQUIRED" | "APPROVED" | "FAILED" = "REVIEW_REQUIRED") => LocalizedTextSchema.parse({ id: fixtureId(401), sourceId: inv.id, sourceVersion: 1, version: 1, canonicalTextHash: "a".repeat(64), language, originalLanguage: "en", text: "PRIVATE_TRANSLATION_SENTINEL", status, generatedAt: fixtureTime });
const render = (view: ReactNode) => renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, view));
beforeEach(() => { state.query = { data: { invitation: inv, localized: [localized()] }, isPending: false, isError: false, refetch: vi.fn() }; });

describe("creator translation review", () => {
  it("uses the distinct owner read without a bearer token or participant response", () => {
    const request = prepareRequest("getInvitationForReview", { params: { id: inv.id } });
    expect(request.url).toBe(`/api/invitations/${inv.id}/review`);
    expect(request.method).toBe("GET");
    expect(request.headers["idempotency-key"]).toBeUndefined();
  });
  it("rejects foreign and superseded source translations before rendering/playback", () => {
    const good = localized();
    expect(currentTranslations([good, { ...good, sourceVersion: 2 }, { ...good, sourceId: fixtureId(999) }], inv)).toEqual([good]);
    expect(render(createElement(Translations, { items: [{ ...good, sourceVersion: 2 }], invitation: inv }))).not.toContain("PRIVATE_TRANSLATION_SENTINEL");
  });
  it("exposes review only in the organizer context, with no accept command", () => {
    const guest = render(createElement(Translations, { items: [localized()], invitation: inv }));
    expect(guest).not.toContain("Organizer: review");
    const owner = render(createElement(CreatorInvitationReviewContent, { invitationId: inv.id }));
    expect(owner).toContain("Original invitation terms");
    expect(owner).toContain("Organizer: review this translation");
    expect(owner).not.toContain("Accept these terms");
    expect(owner).not.toContain("Open my invitation");
  });
  it("withholds translated playback until review; original text stays readable", () => {
    const pending = render(createElement(Translations, { items: [localized()], invitation: inv }));
    expect(pending).toContain("Playback is available after");
    expect(pending).not.toContain("Listen in Español");
    expect(pending).toContain("PRIVATE_TRANSLATION_SENTINEL");
    const approved = render(createElement(Translations, { items: [localized("es", "APPROVED")], invitation: inv }));
    expect(approved).toContain("Listen in Español");
    expect(approved).toContain("reviewed by the organizer");
  });
  for (const code of ["FORBIDDEN", "UNAUTHENTICATED", "NOT_FOUND", "SCOPE_MISMATCH", "INVITATION_REVOKED", "STALE_VERSION"] as const) {
    it(`hides cached terms, translation and audio on ${code}`, () => {
      state.query = { ...state.query, isError: true, error: new ApiRequestError({ operation: "getInvitationForReview", code, message: "Access changed", status: 403, retryable: false }) };
      const html = render(createElement(CreatorInvitationReviewContent, { invitationId: inv.id }));
      expect(html).toContain('role="alert"');
      expect(html).not.toContain("PRIVATE_TRANSLATION_SENTINEL");
      expect(html).not.toContain("Original invitation terms");
      expect(html).not.toContain("<audio");
    });
  }
});
