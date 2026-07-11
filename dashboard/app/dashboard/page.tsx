import { fetchAPI } from "@/lib/api";
import type { DashboardResumenResponse, EmpresaResumen, MovimientoResumen } from "@/lib/types";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MESES_ABREV = [
  "", "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatMonto(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFechaCorta(iso: string) {
  const fecha = new Date(iso);
  const dia = fecha.getDate().toString().padStart(2, "0");
  return `${dia} ${MESES_ABREV[fecha.getMonth() + 1]}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function MovimientoRow({ movimiento }: { movimiento: MovimientoResumen }) {
  return (
    <div className="py-2.5">
      <p className="text-sm font-bold text-zinc-800">
        {movimiento.grupo_origen} {"->"} {movimiento.grupo_destino}
      </p>
      <p className="text-xs text-zinc-400">
        {movimiento.casos_movidos.toLocaleString("es-PE")} casos · {formatMonto(movimiento.monto_movido)} ·{" "}
        {formatFechaCorta(movimiento.fecha)}
      </p>
    </div>
  );
}

function EmpresaCard({ empresa }: { empresa: EmpresaResumen }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-bold text-zinc-800">{empresa.nombre_empresa}</h3>
      <div className="mt-1 divide-y divide-zinc-100 border-t border-zinc-100">
        {empresa.movimientos.map((movimiento, i) => (
          <MovimientoRow key={i} movimiento={movimiento} />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  let data: DashboardResumenResponse | null = null;
  let error: string | null = null;

  try {
    data = await fetchAPI<DashboardResumenResponse>("/api/dashboard/resumen-mes");
  } catch {
    error = "No se pudo conectar con la API. Asegúrate de que el servidor FastAPI esté corriendo.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-800">Últimos movimientos del mes</h2>
        {data && (
          <p className="text-sm text-zinc-500">
            {MESES[data.mes]} {data.anio} · todas las empresas
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
            <StatCard label="Casos movidos" value={data.totales.casos_movidos.toLocaleString("es-PE")} />
            <StatCard label="Monto movido" value={formatMonto(data.totales.monto_movido)} />
            <StatCard label="Rotaciones" value={data.totales.rotaciones.toLocaleString("es-PE")} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-zinc-800">Detalle por empresa</h3>

            {data.empresas.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin movimientos este mes todavía.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {data.empresas.map((empresa) => (
                    <EmpresaCard key={empresa.nombre_empresa} empresa={empresa} />
                  ))}
                </div>

                {data.empresas_adicionales.length > 0 && (
                  <p className="mt-3 text-sm text-zinc-400">
                    + {data.empresas_adicionales.length} empresas más: {data.empresas_adicionales.join(", ")}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
