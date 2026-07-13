"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/historico", label: "Histórico" },
  { href: "/movimientos-mes", label: "Movimientos del mes" },
  { href: "/motor", label: "Motor de movimiento" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col bg-slate-900">
      <div className="border-b border-slate-700/60 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Mercurius
        </p>
        <h1 className="mt-0.5 text-sm font-bold text-white">Motor de Rotación</h1>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
