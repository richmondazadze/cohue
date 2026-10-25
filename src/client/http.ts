import {
  ApiErrorSchema,
  CommandHeadersSchema,
  apiContracts,
  type ApiInput,
  type ApiOperation,
  type ApiOutput,
  type ApiParams,
  type ErrorCodeSchema,
} from "@/contracts";
import type { z } from "zod";

// Typed same-origin HTTP adapter over the shared registry. Never substitutes fixtures for a failed call.
export type ErrorCode = z.output<typeof ErrorCodeSchema>;
/** Client-side failure kinds that never came from the server envelope. */
export type ClientFailure = "NETWORK" | "UNAVAILABLE" | "CONTRACT";

export type CallOptions<K extends ApiOperation> = {
  params?: ApiParams<K>;
  input?: ApiInput<K>;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type PreparedRequest = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export class ApiRequestError extends Error {
  readonly code: ErrorCode | ClientFailure;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly fieldErrors: Record<string, string[]>;
  readonly correlationId: string | null;
  readonly operation: ApiOperation;
  constructor(init: {
    operation: ApiOperation;
    code: ErrorCode | ClientFailure;
    message: string;
    status: number | null;
    retryable: boolean;
    fieldErrors?: Record<string, string[]>;
    correlationId?: string | null;
  }) {
    // Message is server-authored safe copy or our own text; URLs (which may carry bearer tokens) are never included.
    super(init.message);
    this.name = "ApiRequestError";
    this.operation = init.operation;
    this.code = init.code;
    this.status = init.status;
    this.retryable = init.retryable;
    this.fieldErrors = init.fieldErrors ?? {};
    this.correlationId = init.correlationId ?? null;
  }
}

export const isApiError = (e: unknown): e is ApiRequestError =>
  e instanceof ApiRequestError;

export const newIdempotencyKey = (): string =>
  `ui-${globalThis.crypto.randomUUID()}`;

export function prepareRequest<K extends ApiOperation>(
  operation: K,
  options: CallOptions<K> = {},
): PreparedRequest {
  const contract = apiContracts[operation];
  const params = contract.params.safeParse(options.params ?? {});
  if (!params.success)
    throw new ApiRequestError({
      operation,
      code: "CONTRACT",
      message: "The link or reference is not valid.",
      status: null,
      retryable: false,
    });
  const path = contract.path.replace(/:([A-Za-z]+)/g, (_, key: string) =>
    encodeURIComponent((params.data as Record<string, string>)[key]),
  );
  const input = contract.input.safeParse(options.input ?? {});
  if (!input.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of input.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ApiRequestError({
      operation,
      code: "INVALID_INPUT",
      message: "Some details need attention before this can be sent.",
      status: null,
      retryable: false,
      fieldErrors,
    });
  }
  const headers: Record<string, string> = { accept: "application/json" };
  if (contract.idempotentCommand) {
    const key = CommandHeadersSchema.safeParse({
      "idempotency-key": options.idempotencyKey ?? newIdempotencyKey(),
    });
    if (!key.success)
      throw new ApiRequestError({
        operation,
        code: "CONTRACT",
        message: "Command key is invalid.",
        status: null,
        retryable: false,
      });
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

export type ApiData<K extends ApiOperation> = ApiOutput<K>["data"];

export function parseResponse<K extends ApiOperation>(
  operation: K,
  status: number,
  body: unknown,
): ApiData<K> {
  const contract = apiContracts[operation];
  if (status === contract.status) {
    const parsed = contract.response.safeParse(body);
    if (!parsed.success)
      throw new ApiRequestError({
        operation,
        code: "CONTRACT",
        message:
          "The server answered in an unexpected shape, so the result was not used.",
        status,
        retryable: false,
      });
    return (parsed.data as ApiOutput<K>).data;
  }
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success)
    throw new ApiRequestError({
      operation,
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      status,
      retryable: parsed.data.error.retryable,
      fieldErrors: parsed.data.error.fieldErrors,
      correlationId: parsed.data.correlationId,
    });
  throw new ApiRequestError({
    operation,
    code: status === 404 || status >= 500 ? "UNAVAILABLE" : "CONTRACT",
    message:
      status === 404 || status >= 500
        ? "This part of COHUE is not available right now."
        : "The server answered in an unexpected shape, so the result was not used.",
    status,
    retryable: status >= 500,
  });
}

export type Transport = (
  url: string,
  init: RequestInit,
) => Promise<{ status: number; text(): Promise<string> }>;

const defaultTransport: Transport = (url, init) => fetch(url, init);

export async function callApi<K extends ApiOperation>(
  operation: K,
  options: CallOptions<K> = {},
  transport: Transport = defaultTransport,
): Promise<ApiData<K>> {
  const prepared = prepareRequest(operation, options);
  let response: Awaited<ReturnType<Transport>>;
  try {
    response = await transport(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      body: prepared.body,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiRequestError({
      operation,
      code: "NETWORK",
      message: "Could not reach COHUE. Check your connection and try again.",
      status: null,
      retryable: true,
    });
  }
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }
  return parseResponse(operation, response.status, body);
}
