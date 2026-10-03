import { describe, expect, it } from "vitest";
import { createApiClient } from "./client";
import { getHealth } from "./health";

/**
 * Prueba FE→BE contra un backend Express en ejecución.
 * Se ejecuta con `npm run test:integration` y requiere INTEGRATION_API_BASE_URL.
 * No usa token ni datos personales.
 */
const baseUrl = process.env.INTEGRATION_API_BASE_URL;
const origin = process.env.INTEGRATION_FE_ORIGIN ?? "http://localhost:3000";

describe.runIf(baseUrl)("integración FE→BE", () => {
  it("obtiene /api/v1/health con el cliente fetch del frontend", async () => {
    const client = createApiClient({ baseUrl: baseUrl! });
    const health = await getHealth(client);
    expect(health.status).toBe("ok");
    expect(health.service).toBe("fidelizacion-backend");
  });

  it("el backend autoriza CORS para el origen del frontend", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: origin },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
  });

  it("el backend no autoriza CORS para un origen ajeno", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: "http://origen-no-autorizado.test" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
