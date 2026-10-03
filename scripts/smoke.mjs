// Prueba de arranque: levanta el build de producción y comprueba rutas públicas.
// Uso: npm run build && npm run smoke   (FE_SMOKE_PORT opcional, por defecto 3100)
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.FE_SMOKE_PORT ?? 3100);
const base = `http://127.0.0.1:${port}`;
const checks = [
  { path: "/", marker: "Iniciar sesión" },
  { path: "/ingresar", marker: "Iniciar sesión" },
  { path: "/registro", marker: "Registro" },
  { path: "/admin/ingresar", marker: "Acceso de administración" },
  // Zonas protegidas: el HTML del servidor sólo trae el estado de carga.
  {
    path: "/marcas",
    marker: "Cargando tu cuenta",
    ausente: "Mis marcas vinculadas",
  },
  {
    path: "/admin/perfil",
    marker: "Cargando tu cuenta",
    ausente: "Cerrar sesión",
  },
  {
    path: "/inicio",
    marker: "Cargando tu cuenta",
    ausente: "Mis puntos totales",
  },
  { path: "/historial", marker: "Cargando tu cuenta", ausente: "Cargar más" },
  {
    path: "/admin/reglas",
    marker: "Cargando tu cuenta",
    ausente: "Nueva regla",
  },
  {
    path: "/admin/registrar",
    marker: "Cargando tu cuenta",
    ausente: "Aplicar ajuste",
  },
  { path: "/diagnostico", marker: "Conexión frontend → backend" },
];

const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-p",
    String(port),
    "-H",
    "127.0.0.1",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
server.stdout.on("data", (chunk) => (output += chunk));
server.stderr.on("data", (chunk) => (output += chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(base);
      return;
    } catch {
      await delay(500);
    }
  }
  throw new Error(`El servidor no arrancó en ${base}.\n${output}`);
}

let failed = false;
try {
  await waitForServer();
  for (const { path, marker, ausente } of checks) {
    const response = await fetch(base + path);
    const html = await response.text();
    const ok =
      response.status === 200 &&
      html.includes(marker) &&
      (!ausente || !html.includes(ausente));
    console.log(`${ok ? "PASS" : "FAIL"} GET ${path} -> ${response.status}`);
    if (!ok) failed = true;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failed = true;
} finally {
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await exited;
}
process.exitCode = failed ? 1 : 0;
