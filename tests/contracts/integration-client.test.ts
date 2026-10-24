import { describe, it, expect } from "vitest";
import {
  ContractViolation,
  newIdempotencyKey,
  parseResponse,
  prepareRequest,
} from "../e2e/integration/support/contract-client";
import {
  acceptCommand,
  fixtureId,
  invitation,
  mission,
} from "@/fixtures/scenarios";

const correlationId = fixtureId(900);

describe("integration contract client requests", () => {
  it("builds registry paths, JSON bodies and idempotency headers", () => {
    const key = newIdempotencyKey();
    const prepared = prepareRequest("respondInvitation", {
      params: { id: invitation.id },
      input: acceptCommand,
      idempotencyKey: key,
    });
    expect(prepared).toEqual({
      method: "POST",
      url: `/api/invitations/${invitation.id}/respond`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "idempotency-key": key,
      },
      body: JSON.stringify(acceptCommand),
    });
  });
  it("encodes GET input as a query with contract defaults", () => {
    expect(
      prepareRequest("events", {
        params: { id: mission.id },
        input: { after: 4 },
      }).url,
    ).toBe(`/api/missions/${mission.id}/events?after=4&limit=100&format=json`);
    expect(prepareRequest("taxonomy").url).toBe("/api/taxonomy");
  });
  it("refuses requests the backend would be right to reject", () => {
    expect(() =>
      prepareRequest("respondInvitation", {
        params: { id: invitation.id },
        input: acceptCommand,
      }),
    ).toThrow(ContractViolation);
    expect(() =>
      prepareRequest("previewInvitation", { params: { token: "short" } }),
    ).toThrow(/path params/);
    expect(() =>
      prepareRequest("respondInvitation", {
        params: { id: invitation.id },
        input: { ...acceptCommand, action: "COUNTER" },
        idempotencyKey: newIdempotencyKey(),
      }),
    ).toThrow(/invalid input/);
  });
});

describe("integration contract client responses", () => {
  it("accepts only the documented success status and strict body", () => {
    const result = parseResponse("issueInvitationLink", 200, {
      data: {
        invitationId: invitation.id,
        token: "b".repeat(43),
        linkEpoch: 1,
        expiresAt: invitation.expiresAt,
      },
      correlationId,
    });
    expect(result.ok && result.data.linkEpoch).toBe(1);
    expect(() =>
      parseResponse("issueInvitationLink", 200, {
        data: {
          invitationId: invitation.id,
          token: "b".repeat(43),
          linkEpoch: 1,
          expiresAt: invitation.expiresAt,
          termsHash: invitation.termsHash,
        },
        correlationId,
      }),
    ).toThrow(/violates contract/);
  });
  it("requires errors to use the ApiError envelope and mapped HTTP status", () => {
    const error = {
      error: {
        code: "STALE_VERSION",
        message: "Version changed",
        retryable: false,
      },
      correlationId,
    };
    const result = parseResponse("startMission", 409, error);
    expect(!result.ok && result.error.code).toBe("STALE_VERSION");
    expect(() => parseResponse("startMission", 400, error)).toThrow(/HTTP 409/);
    expect(() =>
      parseResponse("startMission", 404, "<html>Not Found</html>"),
    ).toThrow(/neither documented success/);
  });
});
