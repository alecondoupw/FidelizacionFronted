import { describe, expect, it } from "vitest";
import { readFirebaseClientConfig } from "./config";

describe("readFirebaseClientConfig", () => {
  it("devuelve null mientras no haya proyecto Firebase configurado", () => {
    expect(readFirebaseClientConfig({})).toBeNull();
    expect(
      readFirebaseClientConfig({ NEXT_PUBLIC_FIREBASE_API_KEY: "x" }),
    ).toBeNull();
  });

  it("arma la configuración sólo cuando están las cuatro variables", () => {
    expect(
      readFirebaseClientConfig({
        NEXT_PUBLIC_FIREBASE_API_KEY: "clave-ficticia",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo.example",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-proyecto",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:0:web:0",
      }),
    ).toEqual({
      apiKey: "clave-ficticia",
      authDomain: "demo.example",
      projectId: "demo-proyecto",
      appId: "1:0:web:0",
    });
  });
});
