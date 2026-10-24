import { z } from "zod";
import {
  AgentRoleSchema,
  CandidateMatchSchema,
  ExternalOpportunitySchema,
  GroupProposalSchema,
  MatchResultSchema,
  MissionSchema,
  ParticipantSchema,
  RequirementInputSchema,
} from "./domain";
import {
  IdSchema,
  ScopeSchema,
  TextSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";
export const ToolContextSchema = z.strictObject({
  principalId: IdSchema,
  missionId: IdSchema,
  runId: IdSchema,
  agent: AgentRoleSchema,
  scope: ScopeSchema,
  correlationId: IdSchema,
  deadline: TimestampSchema,
  budget: z.strictObject({
    toolCallsRemaining: z.number().int().min(0).max(20),
    providerCallsRemaining: z.number().int().min(0).max(10),
    searchesRemaining: z.number().int().min(0).max(3),
  }),
});
export const DirectorInputSchema = z.strictObject({ mission: MissionSchema });
export const DirectorOutputSchema = z.strictObject({
  requirements: z.array(RequirementInputSchema).max(30),
  unknowns: z.array(TextSchema).max(20),
  requiresConfirmation: z.literal(true),
});
export const ScoutInputSchema = z.strictObject({
  mission: MissionSchema,
  participants: z.array(ParticipantSchema).max(100),
});
export const ScoutOutputSchema = z.strictObject({
  candidates: z.array(CandidateMatchSchema).max(100),
  opportunities: z.array(ExternalOpportunitySchema).max(30),
});
export const StrategistInputSchema = ScoutInputSchema;
export const StrategistOutputSchema = MatchResultSchema;
export const CoordinatorInputSchema = z.strictObject({
  mission: MissionSchema,
  proposal: GroupProposalSchema,
});
export const CoordinatorOutputSchema = z.strictObject({
  missionId: IdSchema,
  missionVersion: VersionSchema,
  outcome: z.enum([
    "INVITATIONS_READY",
    "AWAITING_APPROVAL",
    "REPLAN_QUEUED",
    "ACTIVATED",
    "PAUSED_FOR_HUMAN",
  ]),
});
export const AGENT_TOOLS = {
  DIRECTOR: ["decomposeMission", "validateRequirements", "assignSubtasks"],
  SCOUT: ["searchParticipants", "searchExternalOpportunities", "rankEvidence"],
  STRATEGIST: ["findFeasibleGroups", "scoreCollaboration", "repairPlan"],
  COORDINATOR: [
    "createInvitations",
    "observeConsent",
    "activateMission",
    "notifyParticipants",
  ],
} as const;
// recordConsent is exclusively an authenticated human command, never an LLM tool.
