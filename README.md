# FidelizacionFronted

Frontend **Next.js + TypeScript** de la plataforma de fidelización multimarca Zontes / Kiden / NIU (vista cliente y vista administrador). La documentación canónica, decisiones y evidencias viven en el Core de Obsidian del repositorio [FidelizacionDoc](https://github.com/alecondoupw/FidelizacionDoc) (`Zontes-Core/`). Este repositorio contiene sólo código.

**Estado:** F1–F6 implementadas y verificadas (cliente: acceso, inicio, puntos, historial, catálogo y canje, mis canjes, marcas, novedades y perfil; administración: dashboard, clientes, administradores, reglas, vencimiento, registro de puntos, beneficios, canjes, reportes, exportación y contenido). F7 (entrega y operación) en curso. Sin las variables `NEXT_PUBLIC_FIREBASE_*` las pantallas de acceso avisan que la autenticación no está configurada; `/diagnostico` es técnica.

## Requisitos

- Node.js 24 LTS (`.nvmrc`; `engines` exige `>=24 <25`) y npm 11. `engine-strict=true` impide instalar con otra versión.
- El backend [FidelizacionBackend](https://github.com/alecondoupw/FidelizacionBackend) en ejecución para probar la conexión.

## Puesta en marcha

```bash
npm ci
cp .env.example .env.local   # sólo valores locales; nunca credenciales reales en Git
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                            | Qué hace                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desarrollo (Turbopack)                                                                      |
| `npm run build` / `npm start`     | Build de producción / servidor de producción                                                            |
| `npm run lint` / `lint:fix`       | ESLint (`eslint-config-next` + Prettier + fronteras de arquitectura)                                    |
| `npm run format` / `format:check` | Prettier                                                                                                |
| `npm run typecheck`               | `next typegen` + `tsc --noEmit`                                                                         |
| `npm test`                        | Vitest (unitarias)                                                                                      |
| `npm run test:integration`        | FE→BE contra un backend vivo: `INTEGRATION_API_BASE_URL=http://localhost:4000 npm run test:integration` |
| `npm run smoke`                   | Arranca el build y comprueba `/` y `/diagnostico` (requiere `npm run build`)                            |
| `npm run check`                   | formato → lint → typecheck → test → build                                                               |

## Despliegue

Vercel (DEC-13): importar el repositorio, cargar `NEXT_PUBLIC_API_BASE_URL` y las cuatro `NEXT_PUBLIC_FIREBASE_*` **antes** de compilar (se insertan en el build) y elegir Node.js 24. `next.config.ts` añade cabeceras de seguridad a todas las rutas. Si el backend gratuito está suspendido, la primera carga espera hasta 75 s y lo explica. Procedimiento completo en el Core: `Zontes-Core/08-Produccion/Manual de despliegue y operacion.md`.

## Convenciones

- **HTTP:** `fetch` nativo mediante `src/lib/api` (cliente tipado, sobre de error del contrato v0, tiempo de espera y, desde F1, ID token). Axios está prohibido por ESLint.
- **Firebase:** sólo el SDK cliente para Authentication (`src/lib/firebase`). `firebase/firestore`, `firebase/storage` y `firebase-admin` están prohibidos por ESLint: los datos pasan siempre por Express.
- **Variables:** ver `.env.example`. Las `NEXT_PUBLIC_*` se insertan en el build.
- **UI:** Tailwind CSS 4 + shadcn/ui (`components.json`, estilo `base-nova`) + Lucide. Las vistas se construyen por UI-ID según el mapa de vistas del Core.
