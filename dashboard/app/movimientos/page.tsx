"use client";

import { useState } from "react";
import EmpresaCombobox, { type EmpresaOption } from "@/components/EmpresaCombobox";
import MovimientosModal, {
  type CarteraIngresada,
  type FilaMovimiento,
  type GrupoDestino,
} from "@/components/MovimientosModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const NO_ROTA = "NO ROTA";

interface GrupoFila {
  grupo: string;
  cantidad: number;
  destino: string;
}

interface BusquedaResult {
  empresa: string;
  id_empresa: string;
  grupos: { grupo: string; cantidad: number }[];
}

export default function MovimientosPage() {
  // --- Estado del formulario ---
  const [formKey, setFormKey] = useState(0);
  const [empresaSel, setEmpresaSel] = useState<EmpresaOption | null>(null);
  const [busqueda, setBusqueda] = useState<BusquedaResult | null>(null);
  const [filas, setFilas] = useState<GrupoFila[]>([]);
  const [gruposDestino, setGruposDestino] = useState<GrupoDestino[]>([]);
  const [buscando, setBuscando] = useState(false);

  // --- Estado del carrito de movimientos ---
  const [carteras, setCarteras] = useState<CarteraIngresada[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // --- Búsqueda ---
  async function handleBuscar() {
    if (!empresaSel) return;
    setBuscando(true);
    setBusqueda(null);
    setFilas([]);

    try {
      const [resOrigen, resDestino] = await Promise.all([
        fetch(`${API}/api/empresas/${empresaSel.id}/grupos-origen`).then((r) => r.json()),
        fetch(`${API}/api/empresas/grupos/destino`).then((r) => r.json()),
      ]);

      setBusqueda(resOrigen);
      setGruposDestino(resDestino);
      setFilas(
        (resOrigen.grupos as { grupo: string; cantidad: number }[])
          .filter((g) => g.grupo !== null)
          .map((g) => ({ grupo: g.grupo, cantidad: g.cantidad, destino: NO_ROTA }))
      );
    } finally {
      setBuscando(false);
    }
  }

  function setDestino(index: number, destino: string) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, destino } : f)));
  }

  // --- Agregar al carrito (SIN llamada a API todavía) ---
  function handleAgregar() {
    const aRotar = filas.filter((f) => f.destino !== NO_ROTA);
    if (!busqueda || aRotar.length === 0) return;

    const nuevasFilas: FilaMovimiento[] = aRotar.map((f) => ({
      grupo_origen: f.grupo,
      grupo_destino: f.destino,
      cantidad: f.cantidad,
    }));

    setCarteras((prev) => {
      const idx = prev.findIndex((c) => c.empresa === busqueda.empresa);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], filas: [...updated[idx].filas, ...nuevasFilas] };
        return updated;
      }
      return [...prev, { empresa: busqueda.empresa, id_empresa: busqueda.id_empresa, filas: nuevasFilas }];
    });

    setFormKey((k) => k + 1);
    setEmpresaSel(null);
    setBusqueda(null);
    setFilas([]);
  }

  // --- Editar grupo destino desde el modal ---
  function handleUpdateFila(empresa: string, index: number, nuevoDestino: string) {
    setCarteras((prev) =>
      prev.map((c) =>
        c.empresa === empresa
          ? { ...c, filas: c.filas.map((f, i) => (i === index ? { ...f, grupo_destino: nuevoDestino } : f)) }
          : c
      )
    );
  }

  // --- Eliminar fila desde el modal ---
  function handleDeleteFila(empresa: string, index: number) {
    setCarteras((prev) =>
      prev
        .map((c) =>
          c.empresa === empresa
            ? { ...c, filas: c.filas.filter((_, i) => i !== index) }
            : c
        )
        .filter((c) => c.filas.length > 0)
    );
  }

  // --- Cargar Rotaciones (llamada real a la API desde el modal) ---
  async function handleCargar() {
    const todos = carteras.flatMap((c) =>
      c.filas.map((f) => ({
        id_empresa: c.id_empresa,
        nombre_empresa: c.empresa,
        grupo_origen: f.grupo_origen,
        grupos_destino: [f.grupo_destino],
        cantidad_movimiento: f.cantidad,
      }))
    );

    await Promise.all(
      todos.map((body) =>
        fetch(`${API}/api/movimientos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      )
    );

    setCarteras([]);
  }

  const totalMovimientos = carteras.reduce((acc, c) => acc + c.filas.length, 0);
  const aRotar = filas.filter((f) => f.destino !== NO_ROTA).length;

  return (
    <>
      {modalOpen && carteras.length > 0 && (
        <MovimientosModal
          carteras={carteras}
          gruposDestino={gruposDestino}
          onClose={() => setModalOpen(false)}
          onCargar={async () => {
            await handleCargar();
            setModalOpen(false);
          }}
          onUpdateFila={handleUpdateFila}
          onDeleteFila={handleDeleteFila}
        />
      )}

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">Movimientos</h2>
            <p className="text-sm text-zinc-500">Seleccioná una empresa y configurá la rotación</p>
          </div>

          {totalMovimientos > 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                {totalMovimientos}
              </span>
              Movimientos ingresados
            </button>
          )}
        </div>

        {/* Selección de empresa */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Seleccionar empresa
          </h3>
          <div className="flex items-end gap-3">
            <EmpresaCombobox
              key={formKey}
              onSelect={(emp) => {
                setEmpresaSel(emp);
                setBusqueda(null);
                setFilas([]);
              }}
            />
            <button
              onClick={handleBuscar}
              disabled={!empresaSel || buscando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </section>

        {/* Tabla de grupos */}
        {busqueda && filas.length > 0 && (
          <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-semibold text-zinc-700">{busqueda.empresa}</p>
              <p className="text-xs text-zinc-400">
                Los grupos en <span className="font-semibold">NO ROTA</span> no se incluirán
              </p>
            </div>

            <table className="w-full text-left">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Grupo origen
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Casos
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Grupo destino
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => {
                  const rota = fila.destino !== NO_ROTA;
                  return (
                    <tr
                      key={fila.grupo}
                      className={`border-t border-zinc-100 transition-colors ${rota ? "bg-blue-50/50" : ""}`}
                    >
                      <td className="px-5 py-3 text-sm font-medium text-zinc-800">{fila.grupo}</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-zinc-600">
                        {fila.cantidad.toLocaleString("es-PE")}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={fila.destino}
                          onChange={(e) => setDestino(i, e.target.value)}
                          className={`rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                            rota
                              ? "border-blue-400 font-medium text-blue-700 focus:border-blue-500"
                              : "border-zinc-300 text-zinc-500 focus:border-blue-500"
                          }`}
                        >
                          <option value={NO_ROTA}>NO ROTA</option>
                          {gruposDestino.map((g) => (
                            <option key={g.id} value={g.nombre}>
                              {g.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4">
              <p className="text-xs text-zinc-400">
                {aRotar > 0
                  ? `${aRotar} grupo(s) marcado(s) para rotar`
                  : "Ningún grupo seleccionado"}
              </p>
              <button
                onClick={handleAgregar}
                disabled={aRotar === 0}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar movimiento
              </button>
            </div>
          </section>
        )}

        {busqueda && filas.length === 0 && (
          <p className="text-sm text-zinc-400">
            Esta empresa no tiene grupos con casos en la base de datos.
          </p>
        )}
      </div>
    </>
  );
}
