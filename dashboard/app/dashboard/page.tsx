import { fetchAPI } from "@/lib/api";
import type { DashboardResponse, Estudio } from "@/lib/types";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMonto(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value);
}

function EstudioCard({ estudio }: { estudio: Estudio }) {
  return (
    <div className="flex min-w-40 flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {estudio.grupo}
      </p>
      <p className="mt-2 text-2xl font-bold text-zinc-900">
        {estudio.casos_actuales.toLocaleString("es-PE")}
      </p>
      <p className="text-xs text-zinc-500">casos actuales</p>
      <div className="mt-3 border-t border-zinc-100 pt-3">
        <p className="text-sm font-semibold text-blue-600">
          +{estudio.casos_asignados_mes.toLocaleString("es-PE")} este mes
        </p>
        <p className="mt-1 text-xs text-zinc-400">{formatMonto(estudio.total_monto)}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  let data: DashboardResponse | null = null;
  let error: string | null = null;

  try {
    data = await fetchAPI<DashboardResponse>("/api/dashboard/estudios");
  } catch {
    error = "No se pudo conectar con la API. Asegúrate de que el servidor FastAPI esté corriendo.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-800">Dashboard</h2>
        {data && (
          <p className="text-sm text-zinc-500">
            {MESES[data.mes]} {data.anio} — {data.carteras.length} carteras activas
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data?.carteras.map((cartera) => (
        <section key={cartera.empresa} className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <h3 className="mb-4 text-sm font-bold text-zinc-700 uppercase tracking-wide">
            {cartera.empresa}
          </h3>
          <div className="flex flex-wrap gap-3">
            {cartera.estudios.map((estudio) => (
              <EstudioCard key={estudio.grupo} estudio={estudio} />
            ))}
          </div>
        </section>
      ))}

      {data?.carteras.length === 0 && (
        <p className="text-sm text-zinc-500">No hay carteras con datos este mes.</p>
      )}
    </div>
  );
}
