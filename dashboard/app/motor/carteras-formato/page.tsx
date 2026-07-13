"use client";

import { useEffect, useState } from "react";
import type {
  CarteraPendiente,
  EjecutarLoteResponse,
  ObtenerCasosResponse,
  PendientesResponse,
} from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function CarterasFormatoPage() {
  const [carteras, setCarteras] = useState<CarteraPendiente[] | null>(null);
  const [cargandoPendientes, setCargandoPendientes] = useState(true);
  const [errorPendientes, setErrorPendientes] = useState<string | null>(null);

  const [obteniendo, setObteniendo] = useState(false);
  const [errorObtener, setErrorObtener] = useState<string | null>(null);
  const [casos, setCasos] = useState<ObtenerCasosResponse | null>(null);

  const [confirmando, setConfirmando] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [errorEjecutar, setErrorEjecutar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EjecutarLoteResponse | null>(null);

  async function cargarPendientes() {
    setCargandoPendientes(true);
    setErrorPendientes(null);
    try {
      const data: PendientesResponse = await fetch(`${API}/api/motor/pendientes`).then((r) => r.json());
      setCarteras(data.carteras);
    } catch {
      setErrorPendientes("No se pudo conectar con la API.");
    } finally {
      setCargandoPendientes(false);
    }
  }

  useEffect(() => {
    cargarPendientes();
  }, []);

  async function obtenerCasos() {
    setObteniendo(true);
    setErrorObtener(null);
    setCasos(null);
    setResultado(null);
    try {
      const res = await fetch(`${API}/api/motor/carteras-formato/obtener-casos`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "No se pudo obtener los casos.");
      setCasos(data);
    } catch (e) {
      setErrorObtener(e instanceof Error ? e.message : "No se pudo obtener los casos.");
    } finally {
      setObteniendo(false);
    }
  }

  async function ejecutarRotacion() {
    if (!casos) return;
    setEjecutando(true);
    setErrorEjecutar(null);
    try {
      const res = await fetch(`${API}/api/motor/carteras-formato/ejecutar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lote_id: casos.lote_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "No se pudo ejecutar la rotación.");
      setResultado(data);
      setCasos(null);
      cargarPendientes();
    } catch (e) {
      setErrorEjecutar(e instanceof Error ? e.message : "No se pudo ejecutar la rotación.");
    } finally {
      setConfirmando(false);
      setEjecutando(false);
    }
  }

  const hayPendientes = !!carteras && carteras.length > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-800">Carteras formato</h2>
        <p className="text-sm text-zinc-500">
          Rotación de carteras formato — Motor de movimiento
        </p>
      </div>

      {resultado && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-bold text-green-800">
            ✓ {resultado.casos_movidos.toLocaleString("es-PE")} casos movidos ·{" "}
            {resultado.monto_movido.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-green-700">
            {resultado.detalle.map((d, i) => (
              <li key={i}>
                {d.nombre_empresa}: {d.grupo_origen} → {d.grupo_destino} —{" "}
                {d.casos_movidos.toLocaleString("es-PE")} casos ·{" "}
                {d.monto_movido.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800">Movimientos pendientes</h3>
            <p className="text-xs text-zinc-500">Todas las carteras con órdenes en estado Pendiente</p>
          </div>
          <button
            onClick={obtenerCasos}
            disabled={!hayPendientes || obteniendo}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {obteniendo ? "Obteniendo..." : "Obtener casos"}
          </button>
        </div>

        {errorPendientes && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorPendientes}
          </div>
        )}

        {cargandoPendientes && <p className="mt-3 text-sm text-zinc-400">Cargando...</p>}

        {!cargandoPendientes && carteras && carteras.length === 0 && (
          <p className="mt-3 text-sm text-zinc-400">No hay solicitudes pendientes de ejecución.</p>
        )}

        {!cargandoPendientes && carteras && carteras.length > 0 && (
          <table className="mt-4 w-full text-left">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Cartera
                </th>
                <th className="border-b border-zinc-200 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Órdenes
                </th>
                <th className="border-b border-zinc-200 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Casos estimados
                </th>
              </tr>
            </thead>
            <tbody>
              {carteras.map((c) => (
                <tr key={c.id_empresa} className="border-b border-zinc-50">
                  <td className="py-2 text-sm text-zinc-700">{c.nombre_empresa}</td>
                  <td className="py-2 text-right text-sm text-zinc-600">{c.ordenes_pendientes}</td>
                  <td className="py-2 text-right text-sm font-semibold text-zinc-700">
                    {c.casos_estimados.toLocaleString("es-PE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {errorObtener && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorObtener}
        </div>
      )}

      {casos && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-800">Casos obtenidos</h3>
          <p className="text-xs text-zinc-500">
            {casos.total_casos.toLocaleString("es-PE")} casos ·{" "}
            {casos.total_monto.toLocaleString("es-PE", { style: "currency", currency: "PEN" })} · lote {casos.lote_id}
          </p>

          <table className="mt-4 w-full text-left">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Cartera
                </th>
                <th className="border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Origen
                </th>
                <th className="border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Destino
                </th>
                <th className="border-b border-zinc-200 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Casos
                </th>
                <th className="border-b border-zinc-200 pb-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {casos.resumen.map((r, i) => {
                const esExclusion = r.grupo_destino === "CGMSV" || r.grupo_destino === "MERCURIUS";
                return (
                  <tr key={i} className="border-b border-zinc-50">
                    <td className="py-2 text-sm text-zinc-700">{r.nombre_empresa}</td>
                    <td className="py-2 text-sm text-zinc-600">{r.grupo_origen}</td>
                    <td className="py-2 text-sm">
                      <span
                        className={
                          esExclusion
                            ? "rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                            : "font-medium text-zinc-700"
                        }
                      >
                        {r.grupo_destino}
                      </span>
                    </td>
                    <td className="py-2 text-right text-sm font-semibold text-zinc-700">
                      {r.casos.toLocaleString("es-PE")}
                    </td>
                    <td className="py-2 text-right text-sm text-zinc-600">
                      {r.monto.toLocaleString("es-PE", { style: "currency", currency: "PEN" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {errorEjecutar && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorEjecutar}
            </div>
          )}

          <div className="mt-4 border-t border-zinc-100 pt-4">
            {confirmando ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-500">
                  Esto moverá los casos reales en la base de datos. ¿Confirmas?
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setConfirmando(false)}
                    disabled={ejecutando}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={ejecutarRotacion}
                    disabled={ejecutando}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ejecutando ? "Ejecutando..." : "Confirmar ejecución"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmando(true)}
                className="rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Ejecutar rotación
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
