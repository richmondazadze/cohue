import { test, expect } from "@playwright/test";
import { backendStatus, baseURL, join, requireBackend, retire, type Person } from "./support/journey";
import { Device } from "./support/device";

// Visiting the synthetic showcase and returning must keep the same live identity and profile.
const SHOWCASE = "00000000-0000-4000-8000-000000000384";
let unavailable: string | null = null;
const people: Person[] = [];
test.beforeAll(async () => {
  unavailable = await backendStatus();
  if (unavailable && requireBackend) throw new Error(unavailable);
});
test.beforeEach(() => test.skip(unavailable !== null, unavailable ?? ""));
test.afterAll(async () => {
  await retire(people);
});

test("showcase round trip restores the same live session and profile", async () => {
  const device = await Device.open("browser", baseURL);
  const person = await join("round-trip", "design", 3, "en", { device });
  people.push(person);
  const live = await device.ok("getSession");
  // Asking for a live session while live keeps it.
  expect((await device.ok("createSession", { input: { executionMode: "LIVE", showcaseId: null } })).principalId).toBe(live.principalId);
  const showcase = await device.ok("createSession", { input: { executionMode: "SHOWCASE", showcaseId: SHOWCASE } });
  expect(showcase.kind).toBe("SHOWCASE_OPERATOR");
  const back = await device.ok("createSession", { input: { executionMode: "LIVE", showcaseId: null } });
  expect(back.principalId).toBe(live.principalId);
  expect((await device.ok("getParticipant", { params: { id: person.participantId } })).id).toBe(person.participantId);
});
