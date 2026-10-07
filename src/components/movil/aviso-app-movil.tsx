"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Guia = "ios" | "general" | "https";

function estaEnApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function suscribirModoApp(onChange: () => void) {
  const modos = ["standalone", "fullscreen"].map((modo) =>
    window.matchMedia(`(display-mode: ${modo})`),
  );
  modos.forEach((modo) => modo.addEventListener("change", onChange));
  return () =>
    modos.forEach((modo) => modo.removeEventListener("change", onChange));
}

/** Instalación nativa si el navegador la ofrece; guía manual para los demás. */
export function AvisoAppMovil() {
  const modoApp = useSyncExternalStore(
    suscribirModoApp,
    estaEnApp,
    () => false,
  );
  const [instalada, setInstalada] = useState(false);
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [instalando, setInstalando] = useState(false);
  const [guia, setGuia] = useState<Guia | null>(null);
  const [estado, setEstado] = useState("");

  useEffect(() => {
    const preparar = (event: Event) => {
      event.preventDefault();
      setEvento(event as EventoInstalacion);
      setEstado("");
    };
    const confirmar = () => {
      setEvento(null);
      setInstalada(true);
      setGuia(null);
    };
    window.addEventListener("beforeinstallprompt", preparar);
    window.addEventListener("appinstalled", confirmar);

    if (window.isSecureContext && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() =>
          setEstado("Puedes instalar Zontes desde el menú del navegador."),
        );
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", preparar);
      window.removeEventListener("appinstalled", confirmar);
    };
  }, []);

  async function instalar() {
    if (!window.isSecureContext) {
      setGuia("https");
      return;
    }
    if (!evento) {
      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setGuia(ios ? "ios" : "general");
      return;
    }
    setInstalando(true);
    try {
      await evento.prompt();
      const eleccion = await evento.userChoice;
      setEstado(
        eleccion.outcome === "accepted"
          ? "Finaliza la instalación y abre Zontes desde su icono."
          : "Puedes volver a instalarla desde el menú del navegador.",
      );
    } catch {
      setGuia("general");
    } finally {
      setEvento(null);
      setInstalando(false);
    }
  }

  if (modoApp || instalada) return null;

  return (
    <>
      <aside
        aria-label="Versión móvil de Zontes"
        className="aviso-instalacion shrink-0 bg-[var(--zontes-tinta)] text-white md:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Smartphone
            aria-hidden="true"
            className="size-6 shrink-0 text-[var(--zontes-lima)]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Zontes en tu celular</p>
            <p className="text-xs text-white/80">
              Instala la app y accede desde tu pantalla de inicio.
            </p>
            <p
              id="descarga-movil-estado"
              role="status"
              className="mt-1 text-xs text-white/60"
            >
              {estado || "Abre Zontes como app, sin las barras del navegador."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void instalar()}
            disabled={instalando}
            aria-busy={instalando}
            aria-label="Instalar Zontes"
            aria-describedby="descarga-movil-estado"
            title="Instalar Zontes"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--zontes-lima)] text-black outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-60"
          >
            <Download aria-hidden="true" className="size-5" />
          </button>
        </div>
      </aside>
      <Dialog
        open={guia !== null}
        onOpenChange={(open) => {
          if (!open) setGuia(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar Zontes</DialogTitle>
            <DialogDescription>
              {guia === "https"
                ? "Para instalar Zontes, abre la versión publicada mediante HTTPS."
                : "Añade Zontes a tu pantalla de inicio y ábrela desde su icono."}
            </DialogDescription>
          </DialogHeader>
          {guia === "ios" && (
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Abre esta web en Safari.</li>
              <li>
                Toca <strong>Compartir</strong> y después{" "}
                <strong>Añadir a pantalla de inicio</strong>.
              </li>
              <li>
                Si aparece <strong>Abrir como app</strong>, déjalo activado y
                toca <strong>Añadir</strong>.
              </li>
            </ol>
          )}
          {guia === "general" && (
            <>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Abre el menú de tu navegador.</li>
                <li>
                  Elige <strong>Instalar app</strong> o{" "}
                  <strong>Añadir a pantalla de inicio</strong>, si está
                  disponible.
                </li>
                <li>Confirma y abre Zontes desde el nuevo icono.</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                Para abrirla sin las barras del navegador, recomendamos Chrome
                en Android o Safari en iPhone. Otros navegadores pueden crear
                solo un acceso directo.
              </p>
            </>
          )}
          {guia === "https" && (
            <p className="text-sm text-muted-foreground">
              Una dirección local por HTTP no permite instalarla desde el
              celular. Usa el enlace HTTPS que recibas al publicar la web.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
