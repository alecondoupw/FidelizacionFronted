import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Fronteras de arquitectura (SRC-02 pp. 11–15): el navegador sólo usa
    // Firebase Auth; los datos pasan por Express. Estándar HTTP: fetch.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message: "El estándar HTTP del proyecto es fetch (src/lib/api).",
            },
            {
              name: "firebase/firestore",
              message: "El frontend no accede a Firestore; usa la API Express.",
            },
            {
              name: "firebase/storage",
              message: "El frontend no accede a Storage; usa la API Express.",
            },
          ],
          patterns: [
            {
              group: ["firebase-admin", "firebase-admin/*"],
              message: "Firebase Admin SDK sólo existe en el backend.",
            },
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
