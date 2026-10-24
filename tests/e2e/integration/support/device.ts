import { request, type APIRequestContext } from "@playwright/test";
import type { ApiOperation } from "@/contracts";
import {
  newIdempotencyKey,
  parseResponse,
  prepareRequest,
  type CallOptions,
  type ContractResult,
  type ErrorCode,
} from "./contract-client";

// One Device = one isolated cookie jar, standing in for a separate phone/browser in cross-team journeys.
export class Device {
  private constructor(
    readonly label: string,
    private readonly context: APIRequestContext,
  ) {}

  static async open(label: string, baseURL: string): Promise<Device> {
    return new Device(label, await request.newContext({ baseURL }));
  }

  async call<K extends ApiOperation>(
    operation: K,
    options: CallOptions<K> = {},
  ): Promise<ContractResult<K>> {
    const prepared = prepareRequest(operation, options);
    const response = await this.context.fetch(prepared.url, {
      method: prepared.method,
      headers: prepared.headers,
      data: prepared.body,
      maxRedirects: 0,
    });
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }
    return parseResponse(operation, response.status(), body);
  }

  async ok<K extends ApiOperation>(operation: K, options: CallOptions<K> = {}) {
    const result = await this.call(operation, withKey(options));
    if (!result.ok)
      throw new Error(
        `${this.label} ${operation} failed: ${result.error.code} (${result.correlationId})`,
      );
    return result.data;
  }

  async fails<K extends ApiOperation>(
    operation: K,
    code: ErrorCode,
    options: CallOptions<K> = {},
  ) {
    const result = await this.call(operation, withKey(options));
    if (result.ok)
      throw new Error(`${this.label} ${operation} succeeded; expected ${code}`);
    if (result.error.code !== code)
      throw new Error(
        `${this.label} ${operation} returned ${result.error.code}; expected ${code}`,
      );
    return result.error;
  }

  async close(): Promise<void> {
    await this.context.dispose();
  }
}

const withKey = <K extends ApiOperation>(
  options: CallOptions<K>,
): CallOptions<K> => ({
  ...options,
  idempotencyKey: options.idempotencyKey ?? newIdempotencyKey(),
});
