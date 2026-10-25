import type { z } from "zod";
import type { ErrorCodeSchema } from "@/contracts";

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL_ERROR",
]);
// Typed domain failure mapped to ApiErrorSchema and ERROR_HTTP_STATUS at the route boundary.
export class ApiFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiFailure";
  }
  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }
}
export const fail = (
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): never => {
  throw new ApiFailure(code, message, fieldErrors);
};
