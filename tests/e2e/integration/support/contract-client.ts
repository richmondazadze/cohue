import { randomUUID } from "node:crypto";
import {
  ApiErrorSchema,
  CommandHeadersSchema,
  ERROR_HTTP_STATUS,
  ErrorCodeSchema,
  apiContracts,
  type ApiInput,
  type ApiOperation,
  type ApiOutput,
  type ApiParams,
} from "@/contracts";
import type { z } from "zod";

// Transport-free request/response checks against the shared registry; integration specs never hand-write endpoints.
export type ApiError = z.output<typeof ApiErrorSchema>["error"];
export type ErrorCode = z.output<typeof ErrorCodeSchema>;
export type CallOptions<K extends ApiOperation> = {
  params?: ApiParams<K>;
  input?: ApiInput<K>;
  idempotencyKey?: string;
};
export type PreparedRequest = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  headers: Record<string, string>;
  body?: string;
};
export type ContractResult<K extends ApiOperation> =
  | {
      ok: true;
      status: number;
      data: ApiOutput<K>["data"];
      correlationId: string;
    }
  | { ok: false; status: number; error: ApiError; correlationId: string };

export class ContractViolation extends Error {
  constructor(operation: string, detail: string) {
    super(`${operation}: ${detail}`);
    this.name = "ContractViolation";
  }
}

export const newIdempotencyKey = (): string => `it-${randomUUID()}`;

export function prepareRequest<K extends ApiOperation>(
  operation: K,
  options: CallOptions<K> = {},
): PreparedRequest {
  const contract = apiContracts[operation];
  const params = contract.params.safeParse(options.params ?? {});
  if (!params.success)
    throw new ContractViolation(
      operation,
      `invalid path params ${params.error.message}`,
    );
  const path = contract.path.replace(/:([A-Za-z]+)/g, (_, key: string) =>
    encodeURIComponent((params.data as Record<string, string>)[key]),
  );
  const input = contract.input.safeParse(options.input ?? {});
  if (!input.success)
    throw new ContractViolation(
      operation,
      `invalid input ${input.error.message}`,
    );
  const headers: Record<string, string> = { accept: "application/json" };
  if (contract.idempotentCommand) {
    const key = CommandHeadersSchema.safeParse({
      "idempotency-key": options.idempotencyKey,
    });
    if (!key.success)
      throw new ContractViolation(operation, "idempotency-key header required");
    Object.assign(headers, key.data);
  }
  if (contract.method === "GET") {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(input.data as object))
      if (value !== undefined && value !== null) query.set(name, String(value));
    const qs = query.toString();
    return { method: "GET", url: qs ? `${path}?${qs}` : path, headers };
  }
  headers["content-type"] = "application/json";
  return {
    method: contract.method,
    url: path,
    headers,
    body: JSON.stringify(input.data),
  };
}

export function parseResponse<K extends ApiOperation>(
  operation: K,
  status: number,
  body: unknown,
): ContractResult<K> {
  const contract = apiContracts[operation];
  if (status === contract.status) {
    const parsed = contract.response.safeParse(body);
    if (!parsed.success)
      throw new ContractViolation(
        operation,
        `success body violates contract ${parsed.error.message}`,
      );
    const { data, correlationId } = parsed.data as ApiOutput<K>;
    return { ok: true, status, data, correlationId };
  }
  const parsed = ApiErrorSchema.safeParse(body);
  if (!parsed.success)
    throw new ContractViolation(
      operation,
      `HTTP ${status} is neither documented success ${contract.status} nor ApiError`,
    );
  const expected = ERROR_HTTP_STATUS[parsed.data.error.code];
  if (status !== expected)
    throw new ContractViolation(
      operation,
      `${parsed.data.error.code} must use HTTP ${expected}, got ${status}`,
    );
  return {
    ok: false,
    status,
    error: parsed.data.error,
    correlationId: parsed.data.correlationId,
  };
}
