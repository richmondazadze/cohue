import { describe, expect, it } from "vitest";
import { ErrorCodeSchema } from "@/contracts";
import { ApiRequestError } from "@/client/http";
import { describeError } from "@/client/errors";

const makeError = (code: ConstructorParameters<typeof ApiRequestError>[0]["code"]) => new ApiRequestError({ operation: "createParticipant", code, status: 503, retryable: true, correlationId: "00000000-0000-4000-8000-000000000001", message: "Internal SQL password=SECRET bearer=PRIVATE https://private.example" });
describe("user-facing error copy", () => {
  it.each([...ErrorCodeSchema.options, "NETWORK", "UNAVAILABLE", "CONTRACT"] as const)("safely explains %s without raw server details", code => {
    const result = describeError(makeError(code));
    expect(result.title.length).toBeGreaterThan(5);
    expect(result.body.length).toBeGreaterThan(20);
    expect(result.detail).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/SECRET|PRIVATE|SQL|private.example/);
  });
  it("does not claim an unconfirmed network write failed or was rolled back", () => {
    const copy = describeError(makeError("NETWORK"));
    expect(copy.body).toContain("check its current status");
    expect(copy.body).not.toMatch(/nothing was changed|not saved|rolled back/i);
  });
  it("maps unknown failures to safe guidance without echoing exceptions", () => {
    expect(JSON.stringify(describeError(new Error("secret stack trace")))).not.toContain("secret");
  });
});
