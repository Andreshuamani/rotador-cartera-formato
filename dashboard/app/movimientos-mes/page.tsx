import { fetchAPI } from "@/lib/api";
import type { MovimientosMesResponse, MovimientosMesDetalle } from "@/lib/types";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-900">{value.toLocaleString("es-PE")}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function DetalleRow({ row }: { row: MovimientosMesDetalle }) {
  return (
    <tr className="border-t border-zinc-100 hover:bg-zinc-50">
      <td className="px-4 py-3 text-sm font-medium text-zinc-800">{row.nombre_empresa}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{row.grupo_origen}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{row.grupo_destino}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">
        {row.total_movidos.toLocaleString("es-PE")}
      </td>
      <td className="px-4 py-3 text-right text-xs text-zinc-400">
        {row.cantidad_ejecuciones}
      </td>
    </tr>
  );
}

export default async function MovimientosMesPage() {
  let data: MovimientosMesResponse | null = null;
  let error: string | null = null;

  try {
    data = await fetchAPI<MovimientosMesResponse>("/api/movimientos-mes");
  } catch {
    error = "No se pudo conectar con la API.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-800">Movimientos del mes</h2>
        {data && (
          <p className="text-sm text-zinc-500">
            {MESES[data.mes]} {data.anio}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Casos movidos"
              value={data.totales.total_casos_movidos}
              sub="total del mes"
            />
            <StatCard
              label="Empresas procesadas"
              value={data.totales.empresas_procesadas}
              sub="carteras con movimiento"
            />
            <StatCard
              label="Ejecuciones"
              value={data.totales.total_ejecuciones}
              sub="veces que corrió el motor"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3 text-right">Total movidos</th>
                  <th className="px-4 py-3 text-right">Ejecuciones</th>
                </tr>
              </thead>
              <tbody>
                {data.detalle.map((row, i) => (
                  <DetalleRow key={i} row={row} />
                ))}
                {data.detalle.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">
                      Sin movimientos este mes todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
