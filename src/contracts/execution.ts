import { z } from "zod";
import { AgentRoleSchema } from "./domain";
import {
  HashSchema,
  IdSchema,
  LabelSchema,
  ScopeSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";
// Server-use contract records; no credentials or provider payloads are included.
export const CheckpointSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  scope: ScopeSchema,
  missionVersion: VersionSchema,
  kind: z.enum([
    "DIRECTOR",
    "SCOUT",
    "STRATEGIST",
    "COORDINATOR",
    "WAIT_FOR_APPROVAL",
    "REPLAN",
  ]),
  resumeState: z.enum([
    "PLANNING",
    "DISCOVERING",
    "REPLANNING",
    "AWAITING_APPROVAL",
  ]),
  attempt: z.number().int().min(0).max(3),
  createdAt: TimestampSchema,
});
export const JobSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  scope: ScopeSchema,
  agent: AgentRoleSchema,
  checkpoint: CheckpointSchema,
  inputVersion: VersionSchema,
  status: z.enum([
    "QUEUED",
    "LEASED",
    "WAITING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
  ]),
  leaseOwner: IdSchema.nullable(),
  leaseExpiresAt: TimestampSchema.nullable(),
  fence: VersionSchema,
  attempts: z.number().int().min(0).max(3),
  nextAttemptAt: TimestampSchema,
  dedupeKey: LabelSchema,
});
export const CommandReceiptSchema = z.strictObject({
  id: IdSchema,
  principalId: IdSchema,
  scope: ScopeSchema,
  operation: LabelSchema,
  idempotencyKey: z.string().min(16).max(128),
  payloadDigest: HashSchema,
  httpStatus: z.number().int().min(200).max(299),
  resultRef: IdSchema,
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
});
export type Job = z.infer<typeof JobSchema>;
