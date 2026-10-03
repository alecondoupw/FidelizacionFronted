"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Tarjeta } from "@/components/comun/estado-carga";
import { EtiquetaEstadoCanje } from "@/components/cliente/beneficio-visual";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  anularCanje,
  entregarCanje,
  getCanjeAdmin,
  type CanjeVista,
} from "@/lib/api/canjes";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, formatoFechaHora, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";

/**
 * UI-26 Gestión de canjes por código (propuesta, DEC-07): entrega en
 * mostrador y anulación con motivo. El reporte de canjes (UI-09, A08) es F5.
 */
export function CanjesAdmin() {
  const sesion = useSesion();
  const [codigo, setCodigo] = useState("");
  const [canje, setCanje] = useState<CanjeVista | null>(null);
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    setCanje(null);
    setBuscando(true);
    try {
      setCanje(await getCanjeAdmin(sesion.api(), codigo.trim().toUpperCase()));
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setBuscando(false);
    }
  };

  const entregar = async () => {
    if (!canje) return;
    setOcupado(true);
    setAviso(null);
    try {
      setCanje(await entregarCanje(sesion.api(), canje.codigo));
      setAviso({ tipo: "ok", texto: "Canje marcado como entregado." });
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setOcupado(false);
    }
  };

  const anular = async () => {
    if (!canje) return;
    setOcupado(true);
    setAviso(null);
    try {
      const r = await anularCanje(sesion.api(), canje.codigo, motivo.trim());
      setCanje(r.canje);
      setAviso({
        tipo: "ok",
        texto: `Canje anulado. Se devolvieron ${formatoPuntos(r.canje.puntos)} puntos y una unidad de stock.`,
      });
      setAnulando(false);
      setMotivo("");
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Canjes en mostrador"
        descripcion="Busca un canje por su código para entregarlo o anularlo."
      />
      <Tarjeta>
        <form
          onSubmit={buscar}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="codigo">Código de canje</Label>
            <Input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="ML-XXXX-XXXX-XX"
              className="h-10 font-mono uppercase"
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            className="h-10"
            disabled={buscando || codigo.trim().length < 5}
          >
            <Search aria-hidden="true" /> {buscando ? "Buscando…" : "Buscar"}
          </Button>
        </form>
        {aviso && (
          <Alert
            variant={aviso.tipo === "error" ? "destructive" : "default"}
            role={aviso.tipo === "error" ? "alert" : "status"}
          >
            <AlertDescription>{aviso.texto}</AlertDescription>
          </Alert>
        )}
      </Tarjeta>

      {canje && (
        <Tarjeta
          titulo={canje.beneficioNombre}
          accion={<EtiquetaEstadoCanje valor={canje.estado} />}
        >
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Código</dt>
              <dd className="font-mono font-bold">{canje.codigo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Marca · opción</dt>
              <dd>
                {NOMBRE_MARCA[canje.marca]} · {canje.varianteNombre}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Emitido</dt>
              <dd>{formatoFechaHora(canje.emitidoEn)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Válido hasta</dt>
              <dd>{formatoFecha(canje.venceEn)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Puntos</dt>
              <dd>{formatoPuntos(canje.puntos)}</dd>
            </div>
            {canje.motivoAnulacion && (
              <div>
                <dt className="text-muted-foreground">Motivo de anulación</dt>
                <dd>{canje.motivoAnulacion}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={entregar}
              disabled={ocupado || canje.estado !== "emitido"}
            >
              Marcar entregado
            </Button>
            <Button
              variant="destructive"
              onClick={() => setAnulando(true)}
              disabled={
                ocupado ||
                canje.estado === "entregado" ||
                canje.estado === "anulado"
              }
            >
              Anular canje
            </Button>
          </div>
        </Tarjeta>
      )}

      <AlertDialog
        open={anulando}
        onOpenChange={(abierto: boolean) =>
          !abierto && !ocupado && setAnulando(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este canje?</AlertDialogTitle>
            <AlertDialogDescription>
              Se devuelven los puntos al cliente y una unidad de stock. Queda en
              la auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motivo-anulacion">Motivo</Label>
            <Textarea
              id="motivo-anulacion"
              rows={3}
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={anular}
              disabled={ocupado || motivo.trim().length < 5}
            >
              Anular canje
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
