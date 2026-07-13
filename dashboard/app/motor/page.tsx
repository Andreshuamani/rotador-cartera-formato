import Link from "next/link";

const SUBTAREAS = [
  {
    href: "/motor/carteras-formato",
    titulo: "Rotación de carteras formato",
    descripcion:
      "Obtiene los casos elegibles (retención, consolidados, posibles activos, CSP) y ejecuta la rotación real.",
  },
];

export default function MotorPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-800">Motor de movimiento</h2>
        <p className="text-sm text-zinc-500">Elige una subtarea para ejecutar.</p>
      </div>

      <div className="space-y-3">
        {SUBTAREAS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
          >
            <p className="text-sm font-bold text-zinc-800">{s.titulo}</p>
            <p className="mt-1 text-xs text-zinc-500">{s.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
