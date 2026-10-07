import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(
  new URL("../../../public/sw.js", import.meta.url),
  "utf8",
);

function montarWorker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const cache = { addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(new Response("Aviso sin conexión")),
  };
  const fetch = vi.fn().mockResolvedValue(new Response("Respuesta privada"));
  runInNewContext(source, {
    URL,
    Response,
    caches,
    fetch,
    self: {
      location: { origin: "https://zontes.example" },
      addEventListener: (name: string, fn: (event: unknown) => void) =>
        handlers.set(name, fn),
      skipWaiting: vi.fn(),
    },
  });
  return { handlers, cache, caches, fetch };
}

describe("PWA: la caché contiene sólo recursos públicos", () => {
  it("precarga sólo el aviso offline y el icono, sin páginas ni API", async () => {
    const worker = montarWorker();
    let pending: Promise<unknown> | undefined;
    worker.handlers.get("install")!({
      waitUntil: (p: Promise<unknown>) => {
        pending = p;
      },
    });
    await pending;
    expect(worker.cache.addAll.mock.calls[0][0]).toEqual([
      "/pwa/offline.html",
      "/pwa/icon-192.png",
    ]);
  });

  it("no intercepta peticiones de API, autenticación externa ni escrituras", () => {
    const worker = montarWorker();
    const respondWith = vi.fn();
    for (const request of [
      { method: "GET", mode: "cors", url: "https://zontes.example/api/v1/me" },
      {
        method: "GET",
        mode: "cors",
        url: "https://backend.example/api/v1/puntos",
      },
      {
        method: "POST",
        mode: "cors",
        url: "https://zontes.example/api/v1/canjes",
      },
    ])
      worker.handlers.get("fetch")!({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.caches.match).not.toHaveBeenCalled();
  });

  it("lee las páginas protegidas desde la red, sin almacenarlas", async () => {
    const worker = montarWorker();
    let pending: Promise<Response> | undefined;
    worker.handlers.get("fetch")!({
      request: {
        method: "GET",
        mode: "navigate",
        url: "https://zontes.example/admin/clientes",
      },
      respondWith: (p: Promise<Response>) => {
        pending = p;
      },
    });
    expect(await (await pending!).text()).toBe("Respuesta privada");
    expect(worker.caches.open).not.toHaveBeenCalled();
    expect(worker.caches.match).not.toHaveBeenCalled();
  });

  it("ante un fallo de red muestra el aviso público, sin recuperar datos de usuario", async () => {
    const worker = montarWorker();
    worker.fetch.mockRejectedValue(new TypeError("Offline"));
    let pending: Promise<Response> | undefined;
    worker.handlers.get("fetch")!({
      request: {
        method: "GET",
        mode: "navigate",
        url: "https://zontes.example/perfil",
      },
      respondWith: (p: Promise<Response>) => {
        pending = p;
      },
    });
    expect(await (await pending!).text()).toBe("Aviso sin conexión");
    expect(worker.caches.match).toHaveBeenCalledExactlyOnceWith(
      "/pwa/offline.html",
    );
    expect(worker.caches.open).not.toHaveBeenCalled();
  });
});
