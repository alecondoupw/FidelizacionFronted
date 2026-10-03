import type { ApiClient } from "./client";
import { healthResponseSchema, type HealthResponse } from "./contract";

export function getHealth(
  client: ApiClient,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
): Promise<HealthResponse> {
  return client.request("/health", {
    schema: healthResponseSchema,
    signal: init?.signal,
    headers: init?.headers,
  });
}
