import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { readFirebaseClientConfig } from "./config";

/**
 * Firebase Authentication del navegador (DEC-02: proyecto de desarrollo).
 * Devuelve null si faltan las variables NEXT_PUBLIC_FIREBASE_*; la UI muestra
 * entonces que la autenticación no está configurada.
 */
export function getFirebaseAuth(): Auth | null {
  const config = readFirebaseClientConfig();
  if (!config) return null;
  const app = getApps()[0] ?? initializeApp(config);
  return getAuth(app);
}
