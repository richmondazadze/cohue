import { isApiError } from "./http";

// Human copy for typed failures. Never echoes URLs, tokens or raw server internals.
const COPY: Record<string, { title: string; body: string }> = {
  UNAUTHENTICATED: {
    title: "Your session has ended",
    body: "Start again from this device to continue.",
  },
  FORBIDDEN: {
    title: "Not available to this session",
    body: "This view belongs to someone else, or your access changed.",
  },
  NOT_FOUND: {
    title: "Not found",
    body: "It may have been removed, or the link is incomplete.",
  },
  INVALID_INPUT: {
    title: "Some details need attention",
    body: "Your entries are kept. Correct the highlighted fields and try again.",
  },
  STALE_VERSION: {
    title: "This changed while you were working",
    body: "Your entries are kept. Review the current version before sending again.",
  },
  IDEMPOTENCY_CONFLICT: {
    title: "A different request already used this submission",
    body: "Review the current state, then submit your decision again.",
  },
  INVITATION_EXPIRED: {
    title: "This invitation has expired",
    body: "It can no longer be answered. The organizer can issue a new one.",
  },
  INVITATION_REVOKED: {
    title: "This invitation was withdrawn",
    body: "The link no longer grants access. Nothing was accepted on your behalf.",
  },
  TERMINAL_MISSION: {
    title: "This mission has closed",
    body: "It was cancelled or expired, so no further changes are possible.",
  },
  RATE_LIMITED: {
    title: "Too many requests",
    body: "Wait a moment, then try again.",
  },
  PROVIDER_UNAVAILABLE: {
    title: "A connected service is unavailable",
    body: "Nothing was changed. You can retry, or continue with typed text.",
  },
  CAPACITY_CONFLICT: {
    title: "This time is already committed elsewhere",
    body: "You have an overlapping commitment, so this could not be accepted.",
  },
  SCOPE_MISMATCH: {
    title: "Different mode",
    body: "This belongs to a different live or showcase scope.",
  },
  INTERNAL_ERROR: {
    title: "Something went wrong on our side",
    body: "Nothing was confirmed. Try again shortly.",
  },
  NETWORK: {
    title: "You appear to be offline",
    body: "Nothing was confirmed. Your entries are kept; retry when connected.",
  },
  UNAVAILABLE: {
    title: "Service not available yet",
    body: "COHUE could not reach this part of the service. Nothing was confirmed.",
  },
  CONTRACT: {
    title: "Unexpected response",
    body: "The server's answer did not match the agreed format, so it was not used.",
  },
};

export function describeError(error: unknown): {
  title: string;
  body: string;
  detail: string | null;
  code: string;
  correlationId: string | null;
  retryable: boolean;
} {
  if (isApiError(error)) {
    const copy = COPY[error.code] ?? COPY.INTERNAL_ERROR;
    const fromServer = error.correlationId !== null;
    return {
      ...copy,
      detail: fromServer && error.message !== copy.body ? error.message : null,
      code: error.code,
      correlationId: error.correlationId,
      retryable: error.retryable,
    };
  }
  return {
    ...COPY.INTERNAL_ERROR,
    detail: null,
    code: "UNKNOWN",
    correlationId: null,
    retryable: true,
  };
}
