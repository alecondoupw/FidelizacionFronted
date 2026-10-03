"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, getDefaultApiClient, getHealth } from "@/lib/api";
import type { HealthResponse } from "@/lib/api/contract";

type CheckState =
  | { status: "loading" }
  | { status: "ok"; data: HealthResponse; latencyMs: number; baseUrl: string }
  | { status: "error"; code: string; message: string };

async function runCheck(signal?: AbortSignal): Promise<CheckState> {
  const started = performance.now();
  try {
    const client = getDefaultApiClient();
    const data = await getHealth(client, { signal });
    return {
      status: "ok",
      data,
      latencyMs: Math.round(performance.now() - started),
      baseUrl: client.baseUrl,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", code: error.code, message: error.message };
    }
    return {
      status: "error",
      code: "CONFIG_ERROR",
      message: error instanceof Error ? error.message : "Error desconocido.",
    };
  }
}

export function HealthCheck() {
  const [state, setState] = useState<CheckState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    runCheck(controller.signal).then((next) => {
      if (!controller.signal.aborted) setState(next);
    });
    return () => controller.abort();
  }, []);

  const retry = useCallback(async () => {
    setState({ status: "loading" });
    setState(await runCheck());
  }, []);

  return (
    <section
      aria-labelledby="estado-backend"
      className="flex flex-col gap-4 rounded-lg border p-5"
    >
      <h2 id="estado-backend" className="font-medium">
        Estado del backend
      </h2>
      <div aria-live="polite" data-testid="health-status">
        {state.status === "loading" && (
          <p className="text-muted-foreground">Comprobando…</p>
        )}
        {state.status === "ok" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Resultado</dt>
            <dd data-testid="health-result">Conectado ({state.data.status})</dd>
            <dt className="text-muted-foreground">Servicio</dt>
            <dd>
              {state.data.service} v{state.data.version}
            </dd>
            <dt className="text-muted-foreground">URL base</dt>
            <dd className="font-mono">{state.baseUrl}</dd>
            <dt className="text-muted-foreground">Hora del servidor (UTC)</dt>
            <dd className="font-mono">{state.data.time}</dd>
            <dt className="text-muted-foreground">Latencia</dt>
            <dd>{state.latencyMs} ms</dd>
          </dl>
        )}
        {state.status === "error" && (
          <div role="alert" className="text-sm">
            <p className="font-medium text-destructive">
              Sin conexión ({state.code})
            </p>
            <p className="text-muted-foreground">{state.message}</p>
          </div>
        )}
      </div>
      <Button
        variant="outline"
        className="w-fit"
        onClick={retry}
        disabled={state.status === "loading"}
      >
        Volver a comprobar
      </Button>
    </section>
  );
}
