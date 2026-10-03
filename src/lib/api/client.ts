import type { z } from "zod";
import { API_PREFIX, errorEnvelopeSchema } from "./contract";

/**
 * Estándar HTTP del proyecto: `fetch` nativo (SRC-02 p. 13, SRC-03 p. 12).
 * No se instala Axios. Todas las llamadas a Express pasan por este cliente
 * para unificar errores, tiempo de espera y, desde F1, el ID token de Firebase.
 */

export type ApiErrorCode =
  "NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE" | (string & {});

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly requestId?: string;

  constructor(params: {
    status: number;
    code: ApiErrorCode;
    message: string;
    requestId?: string;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Se conectará a Firebase Auth en F1; en F0 no se envía token. */
  getIdToken?: () => Promise<string | null>;
}

export interface RequestOptions<T> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}

export interface ApiClient {
  readonly baseUrl: string;
  request<T>(path: string, options: RequestOptions<T>): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(path: string, req: RequestOptions<T>): Promise<T> {
    const url = `${baseUrl}${API_PREFIX}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...req.headers,
    };
    if (req.body !== undefined) headers["Content-Type"] = "application/json";

    const token = options.getIdToken ? await options.getIdToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = req.signal
      ? AbortSignal.any([req.signal, timeoutSignal])
      : timeoutSignal;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: req.method ?? "GET",
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal,
        credentials: "omit",
      });
    } catch (cause) {
      const timedOut = timeoutSignal.aborted;
      throw new ApiError({
        status: 0,
        code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
        message: timedOut
          ? "El servidor no respondió a tiempo."
          : "No se pudo conectar con el servidor.",
        cause,
      });
    }

    const payload: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const parsed = errorEnvelopeSchema.safeParse(payload);
      if (parsed.success) {
        throw new ApiError({
          status: response.status,
          code: parsed.data.error.code,
          message: parsed.data.error.message,
          requestId: parsed.data.error.requestId,
        });
      }
      throw new ApiError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: `Respuesta de error sin formato de contrato (HTTP ${response.status}).`,
      });
    }

    const parsed = req.schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError({
        status: response.status,
        code: "INVALID_RESPONSE",
        message: "La respuesta del servidor no cumple el contrato esperado.",
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  return { baseUrl, request };
}
