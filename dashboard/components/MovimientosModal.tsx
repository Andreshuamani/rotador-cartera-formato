"use client";

import { useState } from "react";
import type { FilaPreview } from "@/lib/types";

export type FilaMovimiento = FilaPreview;

export interface CarteraIngresada {
  empresa: string;
  id_empresa: string;
  filas: FilaMovimiento[];
}

export interface GrupoDestino {
  id: number;
  nombre: string;
}

interface Props {
  carteras: CarteraIngresada[];
  gruposDestino: GrupoDestino[];
  onClose: () => void;
  onCargar: () => Promise<void>;
  onUpdateFila: (empresa: string, index: number, nuevoDestino: string) => void;
  onDeleteFila: (empresa: string, index: number) => void;
  onDeleteCartera: (empresa: string) => void;
}

export default function MovimientosModal({
  carteras,
  gruposDestino,
  onClose,
  onCargar,
  onUpdateFila,
  onDeleteFila,
  onDeleteCartera,
}: Props) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set(carteras.map((c) => c.empresa)));
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  function toggle(empresa: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      next.has(empresa) ? next.delete(empresa) : next.add(empresa);
      return next;
    });
  }

  async function handleCargar() {
    setCargando(true);
    try {
      await onCargar();
      setExito(true);
    } finally {
      setCargando(false);
    }
  }

  const totalMovimientos = carteras.reduce((acc, c) => acc + c.filas.length, 0);
  const todasLasFilas = carteras.flatMap((c) => c.filas);
  const totalEvaluados = todasLasFilas.reduce((s, f) => s + f.casos_evaluados, 0);
  const totalExcluidos = todasLasFilas.reduce(
    (s, f) => s + f.casos_excluidos_cgmsv + f.casos_excluidos_mercurius,
    0
  );
  const totalARotar = todasLasFilas.reduce((s, f) => s + f.casos_a_rotar, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-500/20 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-800">Vista previa de la rotación</h2>
            <p className="text-xs text-zinc-400">
              {carteras.length === 1
                ? carteras[0].empresa
                : `${carteras.length} carteras`}{" "}
              · antes de enviar a TI
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        {/* Lista de carteras */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
          {carteras.map((cartera) => {
            const abierta = expandidas.has(cartera.empresa);
            const subtotal = cartera.filas.reduce((s, f) => s + f.casos_a_rotar, 0);
            const evaluados = cartera.filas.reduce((s, f) => s + f.casos_evaluados, 0);
            const excluidos = cartera.filas.reduce(
              (s, f) => s + f.casos_excluidos_cgmsv + f.casos_excluidos_mercurius,
              0
            );
            const cgmsvAplicado = cartera.filas.some((f) => f.mueve_cgmsv);
            const fallecidoAplicado = cartera.filas.some((f) => f.excluye_fallecido);
            const sinTelefonoAplicado = cartera.filas.some((f) => f.excluye_sin_telefono);
            const cgmsvCasos = cartera.filas.reduce((s, f) => s + f.casos_excluidos_cgmsv, 0);
            const fallecidoCasos = cartera.filas.reduce((s, f) => s + f.casos_excluidos_fallecido, 0);
            const sinTelefonoCasos = cartera.filas.reduce(
              (s, f) => s + f.casos_excluidos_sin_telefono,
              0
            );

            return (
              <div key={cartera.empresa} className="rounded-xl border border-zinc-200 overflow-hidden">
                <div className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3">
                  <button
                    onClick={() => toggle(cartera.empresa)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-sm font-semibold text-zinc-800">{cartera.empresa}</span>
                    <span className="text-xs text-zinc-400">
                      {subtotal.toLocaleString("es-PE")} casos a rotar
                    </span>
                    <span className="text-xs text-zinc-400">{abierta ? "▲" : "▼"}</span>
                  </button>
                  <button
                    onClick={() => onDeleteCartera(cartera.empresa)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    Eliminar cartera
                  </button>
                </div>

                {abierta && (
                  <div className="border-t border-zinc-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Grupo origen
                          </th>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Grupo destino
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Casos
                          </th>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartera.filas.map((fila, i) => (
                          <tr key={i} className="border-t border-zinc-50">
                            <td className="px-4 py-2 text-sm text-zinc-700">{fila.grupo_origen}</td>
                            <td className="px-4 py-2">
                              <select
                                value={fila.grupo_destino}
                                onChange={(e) => onUpdateFila(cartera.empresa, i, e.target.value)}
                                className="rounded-lg border border-zinc-200 px-2 py-1 text-sm font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-blue-100"
                              >
                                {gruposDestino.map((g) => (
                                  <option key={g.id} value={g.nombre}>
                                    {g.nombre}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-semibold text-zinc-700">
                              {fila.casos_a_rotar.toLocaleString("es-PE")}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => onDeleteFila(cartera.empresa, i)}
                                className="rounded-md px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Exclusiones aplicadas: de solo lectura, definidas en la solicitud */}
                    <div className="border-t border-zinc-100 px-4 py-3">
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Exclusiones aplicadas
                      </p>
                      <ul className="space-y-1 text-sm">
                        <li className={cgmsvAplicado ? "text-zinc-700" : "text-zinc-300"}>
                          Telefonos no verificados {"->"} CGMSV
                          {cgmsvAplicado
                            ? `: ${cgmsvCasos.toLocaleString("es-PE")} casos`
                            : ": regla no aplicada"}
                        </li>
                        <li className={fallecidoAplicado ? "text-zinc-700" : "text-zinc-300"}>
                          Estado Fallecido/Baja {"->"} MERCURIUS
                          {fallecidoAplicado
                            ? `: ${fallecidoCasos.toLocaleString("es-PE")} casos`
                            : ": regla no aplicada"}
                        </li>
                        <li className={sinTelefonoAplicado ? "text-zinc-700" : "text-zinc-300"}>
                          Sin numero de telefono {"->"} MERCURIUS
                          {sinTelefonoAplicado
                            ? `: ${sinTelefonoCasos.toLocaleString("es-PE")} casos`
                            : ": regla no aplicada"}
                        </li>
                      </ul>
                    </div>

                    <div className="border-t border-zinc-100 bg-blue-50/60 px-4 py-2.5 text-center text-sm font-semibold text-blue-800">
                      {subtotal.toLocaleString("es-PE")} casos a rotar · {evaluados.toLocaleString("es-PE")}{" "}
                      evaluados · {excluidos.toLocaleString("es-PE")} excluidos
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {carteras.length > 1 && (
          <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-2 text-center text-xs text-zinc-400">
            Total: {totalARotar.toLocaleString("es-PE")} casos a rotar · {totalEvaluados.toLocaleString("es-PE")}{" "}
            evaluados · {totalExcluidos.toLocaleString("es-PE")} excluidos
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4">
          {exito ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✓ Solicitud registrada — quedó en estado Pendiente para TI.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-zinc-400">
                Al confirmar, se enviará un aviso automático a tecnologia@mercurius.com.uy
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCargar}
                  disabled={cargando || totalMovimientos === 0}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cargando ? "Enviando..." : "OK, enviar a TI"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
