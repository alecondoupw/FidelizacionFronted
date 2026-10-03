import type { FirebaseOptions } from "firebase/app";

/**
 * Configuración pública del SDK cliente de Firebase (sólo Authentication).
 * F0 deja los nombres de variables; ningún proyecto está conectado hasta
 * DEC-02 y la autorización de Paulo. El navegador nunca usa Firestore,
 * Storage ni Admin SDK: los datos pasan siempre por Express.
 */
export function readFirebaseClientConfig(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
): FirebaseOptions | null {
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const complete = Object.values(config).every(
    (value) => typeof value === "string" && value.length > 0,
  );
  return complete ? config : null;
}
