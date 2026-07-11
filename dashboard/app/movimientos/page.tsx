"use client";

import { useState } from "react";
import EmpresaCombobox, { type EmpresaOption } from "@/components/EmpresaCombobox";
import MovimientosModal, {
  type CarteraIngresada,
  type GrupoDestino,
} from "@/components/MovimientosModal";
import type { FilaPreview, PrevisualizarResponse } from "@/lib/types";

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

  // --- Exclusiones a nivel cartera (informe 5.2): se definen una vez por solicitud ---
  const [mueveCgmsv, setMueveCgmsv] = useState(false);
  const [excluyeFallecido, setExcluyeFallecido] = useState(true);
  const [excluyeSinTelefono, setExcluyeSinTelefono] = useState(true);

  // --- Estado del carrito de movimientos ---
  const [carteras, setCarteras] = useState<CarteraIngresada[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previsualizando, setPrevisualizando] = useState(false);

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

  // --- Agregar al carrito: calcula las exclusiones a nivel cartera (informe 5.2) ---
  async function handleAgregar() {
    const aRotar = filas.filter((f) => f.destino !== NO_ROTA);
    if (!busqueda || aRotar.length === 0) return;

    setPrevisualizando(true);
    try {
      const preview: PrevisualizarResponse = await fetch(`${API}/api/movimientos/previsualizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_empresa: busqueda.id_empresa,
          nombre_empresa: busqueda.empresa,
          filas: aRotar.map((f) => ({
            grupo_origen: f.grupo,
            grupo_destino: f.destino,
            mueve_cgmsv: mueveCgmsv,
            excluye_fallecido: excluyeFallecido,
            excluye_sin_telefono: excluyeSinTelefono,
          })),
        }),
      }).then((r) => r.json());

      const nuevasFilas: FilaPreview[] = preview.filas;

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
      setMueveCgmsv(false);
      setExcluyeFallecido(true);
      setExcluyeSinTelefono(true);
    } finally {
      setPrevisualizando(false);
    }
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

  // --- Eliminar la cartera completa desde el modal ---
  function handleDeleteCartera(empresa: string) {
    setCarteras((prev) => prev.filter((c) => c.empresa !== empresa));
  }

  // --- OK, enviar a TI (llamada real a la API desde el modal) ---
  async function handleCargar() {
    const todos = carteras.flatMap((c) =>
      c.filas.map((f) => ({
        id_empresa: c.id_empresa,
        nombre_empresa: c.empresa,
        grupo_origen: f.grupo_origen,
        grupos_destino: [f.grupo_destino],
        mueve_cgmsv: f.mueve_cgmsv,
        excluye_fallecido: f.excluye_fallecido,
        excluye_sin_telefono: f.excluye_sin_telefono,
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
          onDeleteCartera={handleDeleteCartera}
        />
      )}

      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">Nueva solicitud de rotación</h2>
            <p className="text-sm text-zinc-500">Iniciada por Operaciones</p>
          </div>

          {totalMovimientos > 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {totalMovimientos}
              </span>
              Ver vista previa
            </button>
          )}
        </div>

        {/* Tarjeta principal: cartera, grupos origen y exclusiones */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-zinc-600">
              Cartera
            </label>
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
          </div>

          {busqueda && filas.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 text-sm font-bold text-zinc-800">
                Grupos origen de {busqueda.empresa}
              </h3>

              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="border-b border-zinc-200 pb-2 text-sm font-semibold text-zinc-700">
                      Grupo origen
                    </th>
                    <th className="border-b border-zinc-200 pb-2 text-sm font-semibold text-zinc-700">
                      Casos actuales
                    </th>
                    <th className="border-b border-zinc-200 pb-2 text-sm font-semibold text-zinc-700">
                      Grupo destino
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila, i) => {
                    const rota = fila.destino !== NO_ROTA;
                    return (
                      <tr key={fila.grupo} className="border-b border-zinc-100">
                        <td className="py-3 text-sm text-zinc-800">{fila.grupo}</td>
                        <td className="py-3 text-sm text-zinc-600">
                          {fila.cantidad.toLocaleString("es-PE")} casos
                        </td>
                        <td className="py-3">
                          <select
                            value={fila.destino}
                            onChange={(e) => setDestino(i, e.target.value)}
                            className={`rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                              rota
                                ? "border-zinc-300 font-medium text-zinc-800 focus:border-blue-500"
                                : "border-zinc-200 text-zinc-400 focus:border-blue-500"
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

              {/* Exclusiones a nivel cartera */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-zinc-800">Exclusiones a nivel cartera</h3>
                <p className="mb-3 text-xs text-zinc-500">
                  Se aplican a todos los grupos seleccionados arriba
                </p>

                <div className="space-y-2.5">
                  <ExclusionCheckbox
                    label="Telefonos no verificados"
                    destino="CGMSV"
                    checked={mueveCgmsv}
                    onChange={setMueveCgmsv}
                  />
                  <ExclusionCheckbox
                    label="Estado Fallecido/Baja"
                    destino="MERCURIUS"
                    checked={excluyeFallecido}
                    onChange={setExcluyeFallecido}
                  />
                  <ExclusionCheckbox
                    label="Sin numero de telefono"
                    destino="MERCURIUS"
                    checked={excluyeSinTelefono}
                    onChange={setExcluyeSinTelefono}
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleAgregar}
                  disabled={aRotar === 0 || previsualizando}
                  className="rounded-lg border border-blue-600 bg-white px-5 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {previsualizando ? "Calculando exclusiones..." : "Guardar y generar vista previa"}
                </button>
                <p className="mt-2 text-xs text-zinc-400">
                  El sistema calculará los casos finales y los mostrará en una vista previa.
                </p>
              </div>
            </>
          )}

          {busqueda && filas.length === 0 && (
            <p className="mt-6 text-sm text-zinc-400">
              Esta empresa no tiene grupos con casos en la base de datos.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function ExclusionCheckbox({
  label,
  destino,
  checked,
  onChange,
}: {
  label: string;
  destino: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-zinc-700">{label}</span>
      <span className="text-zinc-300">{"->"}</span>
      <span
        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
          checked ? "bg-zinc-200 text-zinc-700" : "bg-zinc-100 text-zinc-400"
        }`}
      >
        {destino}
      </span>
    </label>
  );
}
