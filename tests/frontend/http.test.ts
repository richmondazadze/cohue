import { describe, expect, it } from "vitest";
import { ApiRequestError, callApi, prepareRequest } from "@/client/http";
import { CommandKeyRing, stableStringify } from "@/client/command";
import { zonedToUtc, utcToZoned } from "@/client/time";
import { encodeQr } from "@/components/qr/qr";

const MID = "00000000-0000-4000-8000-000000000064";
const respond = (status: number, body: unknown) => async () => ({ status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

describe("http adapter", () => {
  it("prepares registry requests with path params, query defaults and idempotency keys", () => {
    const get = prepareRequest("events", { params: { id: MID }, input: { after: 3 } });
    expect(get.url).toBe(`/api/missions/${MID}/events?after=3&limit=100&format=json`);
    expect(get.headers["idempotency-key"]).toBeUndefined();
    const post = prepareRequest("startMission", { params: { id: MID }, input: { expectedVersion: 2 }, idempotencyKey: "ui-1234567890abcdef" });
    expect(post.headers["idempotency-key"]).toBe("ui-1234567890abcdef");
    expect(JSON.parse(post.body as string)).toEqual({ expectedVersion: 2 });
  });
  it("rejects bad params before any request without echoing the token", () => {
    try {
      prepareRequest("previewInvitation", { params: { token: "short-secret" } });
      expect.unreachable();
    } catch (e) {
      expect((e as ApiRequestError).code).toBe("CONTRACT");
      expect((e as Error).message).not.toContain("short-secret");
    }
  });
  it("surfaces typed server errors and refuses malformed success bodies", async () => {
    const stale = { error: { code: "STALE_VERSION", message: "Mission changed", retryable: false }, correlationId: MID };
    await expect(callApi("startMission", { params: { id: MID }, input: { expectedVersion: 1 } }, respond(409, stale))).rejects.toMatchObject({ code: "STALE_VERSION", correlationId: MID });
    await expect(callApi("taxonomy", {}, respond(200, { data: { nope: 1 }, correlationId: MID }))).rejects.toMatchObject({ code: "CONTRACT" });
    await expect(callApi("taxonomy", {}, respond(404, "<html>"))).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(callApi("taxonomy", {}, async () => { throw new TypeError("fetch failed"); })).rejects.toMatchObject({ code: "NETWORK", retryable: true });
  });
});

describe("idempotency key ring", () => {
  it("reuses a key for an identical retry and mints a new one for a new decision or after success", () => {
    let n = 0;
    const ring = new CommandKeyRing(() => `key-${++n}-padding-xx`);
    const a = stableStringify({ action: "ACCEPT", v: 1 });
    const k1 = ring.keyFor(a);
    expect(ring.keyFor(stableStringify({ v: 1, action: "ACCEPT" }))).toBe(k1);
    const k2 = ring.keyFor(stableStringify({ action: "DECLINE", v: 1 }));
    expect(k2).not.toBe(k1);
    ring.settle();
    expect(ring.keyFor(a)).not.toBe(k1);
  });
});

describe("time and QR helpers", () => {
  it("converts wall-clock times in an explicit IANA zone, across DST", () => {
    expect(zonedToUtc("2026-10-25", "14:00", "America/Chicago")).toBe("2026-10-25T19:00:00Z");
    expect(zonedToUtc("2026-12-01", "08:00", "America/Chicago")).toBe("2026-12-01T14:00:00Z");
    expect(zonedToUtc("2026-07-01", "09:30", "Europe/Paris")).toBe("2026-07-01T07:30:00Z");
    expect(utcToZoned("2026-12-01T14:00:00Z", "America/Chicago")).toEqual({ date: "2026-12-01", time: "08:00" });
    expect(zonedToUtc("bad", "14:00", "UTC")).toBeNull();
  });
  it("encodes a QR symbol with finder patterns and the right version size", () => {
    const m = encodeQr(`https://cohue.example/invitations/${"A".repeat(43)}`);
    expect(m.length).toBe(37); // version 5-M
    const finder = (x: number, y: number) => [0, 6].every((d) => m[y][x + d] && m[y + d][x]);
    expect(finder(0, 0) && finder(m.length - 7, 0) && finder(0, m.length - 7)).toBe(true);
  });
});
