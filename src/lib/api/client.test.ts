import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./client";
import { getHealth } from "./health";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sentHeaders(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>) {
  return fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
}

const healthy = {
  status: "ok",
  service: "fidelizacion-backend",
  version: "0.1.0",
  time: "2026-10-03T05:00:00.000Z",
};

describe("createApiClient", () => {
  it("llama a /api/v1 con la URL base sin barra final y valida el contrato", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(healthy));
    const client = createApiClient({
      baseUrl: "http://localhost:4000/",
      fetchImpl,
    });

    await expect(getHealth(client)).resolves.toEqual(healthy);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/health",
      expect.objectContaining({ method: "GET", credentials: "omit" }),
    );
  });

  it("no envía Authorization cuando no hay token", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(healthy));
    const client = createApiClient({ baseUrl: "http://be", fetchImpl });
    await getHealth(client);
    expect(sentHeaders(fetchImpl).Authorization).toBeUndefined();
  });

  it("envía el ID token como Bearer cuando existe", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(healthy));
    const client = createApiClient({
      baseUrl: "http://be",
      fetchImpl,
      getIdToken: async () => "token-de-prueba",
    });
    await getHealth(client);
    expect(sentHeaders(fetchImpl).Authorization).toBe("Bearer token-de-prueba");
  });

  it("convierte el sobre de error del backend en ApiError", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse(
        {
          error: {
            code: "NOT_FOUND",
            message: "Ruta no encontrada.",
            requestId: "req-1",
          },
        },
        404,
      ),
    );
    const client = createApiClient({ baseUrl: "http://be", fetchImpl });
    const error = await getHealth(client).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      requestId: "req-1",
    });
  });

  it("rechaza una respuesta 200 que no cumple el contrato", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ status: "ok" }),
    );
    const client = createApiClient({ baseUrl: "http://be", fetchImpl });
    await expect(getHealth(client)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("reporta NETWORK_ERROR cuando el backend no está disponible", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const client = createApiClient({ baseUrl: "http://be", fetchImpl });
    await expect(getHealth(client)).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("reporta TIMEOUT cuando el backend no responde a tiempo", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const client = createApiClient({
      baseUrl: "http://be",
      fetchImpl,
      timeoutMs: 20,
    });
    await expect(getHealth(client)).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
