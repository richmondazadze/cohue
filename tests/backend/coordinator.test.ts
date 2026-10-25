import { describe, expect, it, vi } from "vitest";
import { apiContracts } from "@/contracts";

const generateJson = vi.fn();
vi.mock("@/server/providers/gemini", () => ({ generateJson: (input: unknown) => generateJson(input) }));
const { coordinatorTurn } = await import("@/server/domain/extraction");
let modelValidate: { safeParse: (v: unknown) => { success: boolean } };

describe("Coordinator conversation turn", () => {
  it("sends the whole conversation and returns a reply, follow-ups and a review-only draft", async () => {
    generateJson.mockResolvedValueOnce({
      objective: "Run a repair café on Saturday",
      expectedOutput: null,
      requirements: [{ kind: "HUMAN", skill: "hardware", priority: "REQUIRED", minimumCoverage: 2 }],
      minGroupSize: 3,
      maxGroupSize: 5,
      preferences: [],
      unknowns: [],
      reply: "A neighborhood repair café: I'll look for people who fix hardware.",
      questions: ["How long will you work together?"],
    });
    const out = await coordinatorTurn(
      [
        { role: "CREATOR", text: "Repair café on Saturday" },
        { role: "COORDINATOR", text: "Who do you need?" },
        { role: "CREATOR", text: "Two people who fix electronics" },
      ],
      "en",
    );
    const call = generateJson.mock.calls[0][0] as { prompt: string; validate: typeof modelValidate };
    modelValidate = call.validate;
    const prompt = call.prompt;
    expect(prompt).toContain("Creator: Repair café on Saturday\nCoordinator: Who do you need?\nCreator: Two people who fix electronics");
    expect(apiContracts.coordinateMission.response.shape.data.safeParse(out).success).toBe(true);
    expect(out.questions).toEqual(["How long will you work together?"]);
    expect(out.draft.requirements[0]).toMatchObject({ normalizedSkillId: "hardware", minimumCoverage: 2 });
    expect(out.draft.constraintsDraft).toMatchObject({ minGroupSize: 3, maxGroupSize: 5 });
    expect(out.draft.requiresConfirmation).toBe(true);
    // Creator participation is never inferred unless stated.
    expect(out.draft.constraintsDraft).not.toHaveProperty("creatorParticipates");
  });

  it("rejects more than two follow-up questions from the model", () => {
    expect(
      modelValidate.safeParse({ objective: "x", requirements: [], preferences: [], unknowns: [], reply: "ok", questions: ["a", "b", "c"] }).success,
    ).toBe(false);
  });

  it("bounds the conversation in the contract", () => {
    const turn = { role: "CREATOR", text: "hi" };
    expect(apiContracts.coordinateMission.input.safeParse({ language: "en", turns: [] }).success).toBe(false);
    expect(apiContracts.coordinateMission.input.safeParse({ language: "en", turns: Array(13).fill(turn) }).success).toBe(false);
    expect(apiContracts.coordinateMission.input.safeParse({ language: "en", turns: [turn] }).success).toBe(true);
  });
});
