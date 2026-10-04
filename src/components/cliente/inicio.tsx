"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  History,
  Search,
  ShoppingBag,
  Ticket,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { SUPERFICIE_MARCA } from "@/components/contenido/publicacion-visual";
import type { Marca } from "@/lib/api/contract";
import { getMisCanjes } from "@/lib/api/canjes";
import { getContenidos, type PublicacionCliente } from "@/lib/api/contenidos";
import {
  getReglasCliente,
  getSaldo,
  type Evento,
  type ReglaCliente,
  type Saldo,
} from "@/lib/api/puntos";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoFecha,
  formatoFechaLarga,
  formatoPuntos,
  NOMBRE_EVENTO,
  puntosTexto,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";
import { ResumenSaldo } from "./resumen-saldo";

/** Accesos rápidos de SRC-06 p. 5 punto 6. */
const ACCESOS = [
  {
    href: "/catalogo",
    titulo: "Ver catálogo",
    texto: "Descubre productos y experiencias",
    icono: Gift,
  },
  {
    href: "/canjes",
    titulo: "Mis canjes",
    texto: "Revisa tus canjes y estados",
    icono: Ticket,
  },
  {
    href: "/historial",
    titulo: "Historial de puntos",
    texto: "Consulta todos tus movimientos",
    icono: History,
  },
  {
    href: "/perfil",
    titulo: "Mi perfil",
    texto: "Actualiza tus datos",
    icono: UserRound,
  },
];

const DESCRIPCION_EVENTO: Record<Evento, string> = {
  compra: "Acumula puntos al comprar motos, repuestos y accesorios.",
  referido: "Invita a amigos y suma puntos cuando se unan.",
  mantenimiento: "Suma puntos con cada servicio en talleres autorizados.",
  asistencia: "Participa en rutas, lanzamientos y eventos de la marca.",
};
const ICONO_EVENTO: Record<Evento, typeof Gift> = {
  compra: ShoppingBag,
  referido: Users,
  mantenimiento: Wrench,
  asistencia: CalendarDays,
};
const DIAS_AVISO = 30;

/**
 * UI-13 Inicio cliente según la referencia de SRC-06 pp. 4–5 (DEC-19): datos
 * reales del cliente, banner ilustrado sin fotos (DEC-11) que rota sus
 * publicaciones destacadas, avisos calculados y formas de ganar puntos de las
 * reglas activas. El total es informativo: cada marca conserva su saldo.
 */
export function Inicio() {
  const sesion = useSesion();
  const me = usePerfil();
  const api = () => sesion.api();
  const saldo = useCarga(() => getSaldo(api()), [me.uid]);
  const destacadas = useCarga(
    () => getContenidos(api(), { destacadas: true, limite: 5 }),
    [me.uid],
  );
  const canjes = useCarga(() => getMisCanjes(api(), { limite: 20 }), [me.uid]);
  const reglas = useCarga(() => getReglasCliente(api()), [me.uid]);

  const listas = <T,>(c: { estado: string; datos?: T }) =>
    c.estado === "listo" ? (c.datos as T) : undefined;
  const avisos = calcularAvisos({
    saldo: listas<Saldo>(saldo.carga),
    canjesEmitidos: listas<{ items: { estado: string }[] }>(
      canjes.carga,
    )?.items.filter((c) => c.estado === "emitido").length,
    destacadas: listas<{ items: PublicacionCliente[] }>(destacadas.carga)
      ?.items,
  });

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoInicio avisos={avisos} />

      <BannerInicio
        marcas={me.marcas}
        destacadas={
          destacadas.carga.estado === "listo"
            ? destacadas.carga.datos.items
            : []
        }
      />

      <EstadoCarga
        carga={saldo.carga}
        recargar={saldo.recargar}
        etiqueta="tu saldo"
      >
        {(s) => <ResumenSaldo saldo={s} conDetalles />}
      </EstadoCarga>

      <nav
        aria-label="Accesos rápidos"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {ACCESOS.map(({ href, titulo, texto, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Icono aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{titulo}</span>
              <span className="block text-xs text-muted-foreground">
                {texto}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Tarjeta
          titulo="Mis marcas vinculadas"
          descripcion="Cada marca conserva sus puntos por separado."
          accion={
            <Link
              href="/marcas"
              className="text-sm font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline"
            >
              Gestionar marcas
            </Link>
          }
        >
          <EstadoCarga
            carga={saldo.carga}
            recargar={saldo.recargar}
            etiqueta="tus marcas"
            alto="h-28"
          >
            {(s) => <MarcasVinculadas saldo={s} />}
          </EstadoCarga>
        </Tarjeta>

        <Tarjeta
          titulo="¿Cómo ganar puntos?"
          descripcion="Formas de acumular habilitadas en tus marcas."
        >
          <EstadoCarga
            carga={reglas.carga}
            recargar={reglas.recargar}
            etiqueta="las formas de ganar puntos"
            alto="h-28"
          >
            {({ items }) => <ComoGanar reglas={items} />}
          </EstadoCarga>
        </Tarjeta>
      </div>
    </div>
  );
}

// ── Encabezado: saludo, búsqueda, avisos y perfil ─────────────────────
interface Aviso {
  texto: string;
  href: string;
}

/** Avisos derivados de datos reales, sin almacenamiento nuevo (DEC-19). */
export function calcularAvisos({
  saldo,
  canjesEmitidos,
  destacadas,
  ahora = new Date(),
}: {
  saldo?: Saldo;
  canjesEmitidos?: number;
  destacadas?: PublicacionCliente[];
  ahora?: Date;
}): Aviso[] {
  const limite = new Date(ahora.getTime() + DIAS_AVISO * 86_400_000);
  const avisos: Aviso[] = [];
  for (const m of saldo?.marcas ?? []) {
    const v = m.proximoVencimiento;
    if (v && new Date(v.fecha) <= limite) {
      avisos.push({
        texto: `${puntosTexto(v.puntos)} de ${NOMBRE_MARCA[m.marca]} ${v.puntos === 1 ? "vence" : "vencen"} el ${formatoFecha(v.fecha)}.`,
        href: "/puntos",
      });
    }
  }
  if (canjesEmitidos) {
    avisos.push({
      texto:
        canjesEmitidos === 1
          ? "Tienes 1 canje por recoger en tienda."
          : `Tienes ${canjesEmitidos} canjes por recoger en tienda.`,
      href: "/canjes",
    });
  }
  for (const p of (destacadas ?? []).slice(0, 3)) {
    avisos.push({
      texto: `${NOMBRE_MARCA[p.marca]}: ${p.titulo}`,
      href: `/novedades?marca=${p.marca}`,
    });
  }
  return avisos;
}

function EncabezadoInicio({ avisos }: { avisos: Aviso[] }) {
  const sesion = useSesion();
  const router = useRouter();
  const [hoy] = useState(() => new Date());
  const [busqueda, setBusqueda] = useState("");
  const nombre = sesion.usuario?.nombre?.trim();
  const inicial = (nombre || sesion.usuario?.correo || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border sm:p-5 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          {nombre ? `Hola de nuevo, ${nombre}` : "Hola de nuevo"}
        </h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatoFechaLarga(hoy)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <form
          role="search"
          aria-label="Buscar en el catálogo"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-muted px-3 lg:w-72 lg:flex-none"
          onSubmit={(e) => {
            e.preventDefault();
            const q = busqueda.trim();
            router.push(
              q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo",
            );
          }}
        >
          <Search
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <label htmlFor="inicio-buscar" className="sr-only">
            Buscar beneficios o productos
          </label>
          <input
            id="inicio-buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar beneficios o productos…"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>
        <Avisos avisos={avisos} />
        <Link
          href="/perfil"
          aria-label="Mi perfil"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {inicial}
        </Link>
      </div>
    </header>
  );
}

function Avisos({ avisos }: { avisos: Aviso[] }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) =>
      e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={
          avisos.length
            ? `Avisos (${avisos.length})`
            : "Avisos (no tienes avisos)"
        }
        onClick={() => setAbierto((a) => !a)}
        className="relative flex size-10 items-center justify-center rounded-full ring-1 ring-border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Bell aria-hidden="true" className="size-5" />
        {avisos.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-2 rounded-full bg-destructive"
          />
        )}
      </button>
      {abierto && (
        <div
          id={id}
          role="region"
          aria-label="Avisos"
          className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-popover p-2 shadow-lg ring-1 ring-border"
        >
          {avisos.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No tienes avisos por ahora.
            </p>
          ) : (
            <ul className="flex flex-col">
              {avisos.map((a) => (
                <li key={a.texto}>
                  <Link
                    href={a.href}
                    className="block rounded-lg p-3 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {a.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Banner ────────────────────────────────────────────────────────────
/**
 * Pieza visual sin fotos ni logotipos (DEC-11) con el mensaje de fidelización
 * y, a continuación, las publicaciones destacadas vigentes de sus marcas. Sin
 * avance automático (WCAG 2.2.2).
 */
function BannerInicio({
  marcas,
  destacadas,
}: {
  marcas: Marca[];
  destacadas: PublicacionCliente[];
}) {
  const [i, setI] = useState(0);
  const total = 1 + destacadas.length;
  const actual = Math.min(i, total - 1);
  const p = actual > 0 ? destacadas[actual - 1]! : null;
  const nombres = (
    marcas.length ? marcas : (["zontes", "kiden", "niu"] as const)
  ).map((m) => NOMBRE_MARCA[m]);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,var(--secondary),color-mix(in_oklab,var(--primary)_22%,var(--card)))] p-5 sm:p-8"
    >
      <div
        aria-roledescription="diapositiva"
        aria-label={total > 1 ? `${actual + 1} de ${total}` : undefined}
        aria-live="polite"
        className="flex max-w-2xl flex-col gap-3"
      >
        {p ? (
          <>
            <p className="text-xs font-bold tracking-wide text-primary uppercase">
              {NOMBRE_MARCA[p.marca]} · Novedad destacada
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {p.titulo}
            </h2>
            {p.texto && <p className="text-muted-foreground">{p.texto}</p>}
            <Link
              href={`/novedades?marca=${p.marca}`}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Ver novedades de {NOMBRE_MARCA[p.marca]}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        ) : (
          <>
            <p
              aria-hidden="true"
              className="flex flex-wrap gap-x-4 text-sm font-extrabold tracking-[0.2em] text-primary uppercase"
            >
              {nombres.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Tu pasión por las motos tiene más beneficios
            </h2>
            <p className="text-muted-foreground">
              Acumula puntos con{" "}
              {nombres.join(", ").replace(/, ([^,]*)$/, " y $1")} y canjéalos
              por productos, accesorios y experiencias.
            </p>
            <Link
              href="/catalogo"
              className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Explorar catálogo
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setI((actual - 1 + total) % total)}
            className="flex size-9 items-center justify-center rounded-full bg-card ring-1 ring-border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Destacado anterior"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {actual + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => setI((actual + 1) % total)}
            className="flex size-9 items-center justify-center rounded-full bg-card ring-1 ring-border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Destacado siguiente"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}

// ── Marcas y formas de ganar ──────────────────────────────────────────
function MarcasVinculadas({ saldo }: { saldo: Saldo }) {
  if (saldo.marcas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Todavía no tienes marcas vinculadas. Se vinculan solas cuando tu correo
        figura como cliente de Zontes, Kiden o NIU; si crees que falta alguna,
        consulta en tu tienda.
      </p>
    );
  }
  return (
    <ul
      aria-label="Marcas vinculadas"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {saldo.marcas.map((m) => (
        <li
          key={m.marca}
          className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-border"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-extrabold",
                SUPERFICIE_MARCA[m.marca],
              )}
            >
              {NOMBRE_MARCA[m.marca].charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="font-bold">{NOMBRE_MARCA[m.marca]}</p>
              <p className="text-xs text-exito">Vinculada</p>
            </div>
          </div>
          <p className="text-lg font-extrabold">
            {formatoPuntos(m.disponible)}{" "}
            <span className="text-sm font-medium text-muted-foreground">
              puntos
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function ComoGanar({ reglas }: { reglas: ReglaCliente[] }) {
  const eventos = (Object.keys(DESCRIPCION_EVENTO) as Evento[]).filter((e) =>
    reglas.some((r) => r.evento === e),
  );
  if (eventos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        Tus marcas aún no tienen formas de acumulación activas.
      </p>
    );
  }
  return (
    <ul aria-label="Formas de ganar puntos" className="flex flex-col gap-2">
      {eventos.map((e) => {
        const Icono = ICONO_EVENTO[e];
        return (
          <li
            key={e}
            className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-border"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Icono aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{NOMBRE_EVENTO[e]}</p>
              <p className="text-sm text-muted-foreground">
                {DESCRIPCION_EVENTO[e]}
              </p>
              <p className="text-xs text-muted-foreground">
                {reglas
                  .filter((r) => r.evento === e)
                  .map(
                    (r) => `${NOMBRE_MARCA[r.marca]}: ${puntosTexto(r.puntos)}`,
                  )
                  .join(" · ")}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
