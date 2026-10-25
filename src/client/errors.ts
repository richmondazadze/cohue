import { isApiError } from "./http";

// Human copy for typed failures. Never echoes URLs, tokens or raw server internals.
const COPY: Record<string, { title: string; body: string }> = {
  UNAUTHENTICATED: {
    title: "Your session has ended",
    body: "Start again from this device to continue.",
  },
  FORBIDDEN: {
    title: "You can’t open this right now",
    body: "Your access may have changed, or this belongs to another person. Open your own invitation link or return to your space.",
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
    title: "Please check before sending again",
    body: "We could not confirm this submission. Check the latest details before trying again.",
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
    title: "Let’s pause for a moment",
    body: "Wait a moment, then try again.",
  },
  PROVIDER_UNAVAILABLE: {
    title: "This feature needs a moment",
    body: "One of the services this feature uses is not responding. Try again shortly. If you were using voice, you can type instead.",
  },
  CAPACITY_CONFLICT: {
    title: "This time is already committed elsewhere",
    body: "You have an overlapping commitment, so this could not be accepted.",
  },
  SCOPE_MISMATCH: {
    title: "This belongs to a different workspace",
    body: "Live activity and the synthetic showcase are kept separate. Return to the workspace where you opened this.",
  },
  INTERNAL_ERROR: {
    title: "Something went wrong on our side",
    body: "We could not finish this request. If you were saving or responding, check the latest status before trying again.",
  },
  NETWORK: {
    title: "We couldn’t connect",
    body: "Check your connection. If you were saving a change, check its current status before trying again.",
  },
  UNAVAILABLE: {
    title: "We couldn’t reach the service",
    body: "This part of COHUE is temporarily unavailable. Try again in a moment. If you were saving, check whether it went through first.",
  },
  CONTRACT: {
    title: "We couldn’t confirm the result",
    body: "We received a reply we could not use. Check the latest details before sending your change again.",
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
    return {
      ...copy,
      detail: null,
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
