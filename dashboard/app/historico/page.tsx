import { fetchAPI } from "@/lib/api";
import type { HistoricoResponse, HistorialItem } from "@/lib/types";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function HistorialRow({ item }: { item: HistorialItem }) {
  const fecha = new Date(item.fecha_ejecucion);
  return (
    <tr className="border-t border-zinc-100 hover:bg-zinc-50">
      <td className="px-4 py-3 text-xs text-zinc-400">{item.id}</td>
      <td className="px-4 py-3 text-sm font-medium text-zinc-800">{item.nombre_empresa}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{item.grupo_origen}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{item.grupo_destino}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">
        {item.cantidad_movida.toLocaleString("es-PE")}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">
        {MESES[item.mes]} {item.anio}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">
        {fecha.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
      </td>
    </tr>
  );
}

export default async function HistoricoPage() {
  let data: HistoricoResponse | null = null;
  let error: string | null = null;

  try {
    data = await fetchAPI<HistoricoResponse>("/api/historico");
  } catch {
    error = "No se pudo conectar con la API.";
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-800">Histórico</h2>
        <p className="text-sm text-zinc-500">
          Registro de todas las ejecuciones de rotación
          {data ? ` — ${data.total} registros` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3 text-right">Movidos</th>
              <th className="px-4 py-3">Periodo</th>
              <th className="px-4 py-3">Ejecutado</th>
            </tr>
          </thead>
          <tbody>
            {data?.historico.map((item) => (
              <HistorialRow key={item.id} item={item} />
            ))}
            {data?.historico.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No hay registros en el historial todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
