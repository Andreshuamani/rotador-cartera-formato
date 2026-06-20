"use client";

import { useState } from "react";

export interface FilaMovimiento {
  grupo_origen: string;
  grupo_destino: string;
  cantidad: number;
}

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
}

export default function MovimientosModal({
  carteras,
  gruposDestino,
  onClose,
  onCargar,
  onUpdateFila,
  onDeleteFila,
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
  const totalCasos = carteras.reduce(
    (acc, c) => acc + c.filas.reduce((s, f) => s + f.cantidad, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-zinc-800">Movimientos ingresados</h2>
            <p className="text-xs text-zinc-400">
              {carteras.length} cartera(s) — {totalMovimientos} movimiento(s) —{" "}
              {totalCasos.toLocaleString("es-PE")} casos aproximados
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
        <div className="max-h-[55vh] overflow-y-auto px-6 py-4 space-y-3">
          {carteras.map((cartera) => {
            const abierta = expandidas.has(cartera.empresa);
            const subtotal = cartera.filas.reduce((s, f) => s + f.cantidad, 0);
            return (
              <div key={cartera.empresa} className="rounded-xl border border-zinc-200 overflow-hidden">
                <button
                  onClick={() => toggle(cartera.empresa)}
                  className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-800">{cartera.empresa}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {cartera.filas.length} mov.
                    </span>
                    <span className="text-xs text-zinc-400">
                      ~{subtotal.toLocaleString("es-PE")} casos
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">{abierta ? "▲" : "▼"}</span>
                </button>

                {abierta && (
                  <table className="w-full text-left">
                    <thead className="border-t border-zinc-100 bg-white">
                      <tr>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Grupo origen
                        </th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Grupo destino
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Cant. aprox.
                        </th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartera.filas.map((fila, i) => (
                        <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50">
                          <td className="px-4 py-2 text-sm text-zinc-700">{fila.grupo_origen}</td>
                          <td className="px-4 py-2">
                            <select
                              value={fila.grupo_destino}
                              onChange={(e) => onUpdateFila(cartera.empresa, i, e.target.value)}
                              className="rounded-lg border border-blue-300 px-2 py-1 text-sm font-medium text-blue-700 outline-none focus:ring-2 focus:ring-blue-100"
                            >
                              {gruposDestino.map((g) => (
                                <option key={g.id} value={g.nombre}>
                                  {g.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-zinc-600">
                            {fila.cantidad.toLocaleString("es-PE")}
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
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4">
          {exito ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✓ Rotaciones cargadas correctamente en ordenes_rotacion.
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Al cargar, los movimientos se registrarán como{" "}
                <span className="font-semibold text-yellow-600">Pendiente</span>.
              </p>
              <button
                onClick={handleCargar}
                disabled={cargando || totalMovimientos === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cargando ? "Cargando..." : "Cargar Rotaciones"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
