import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Car, Fuel, Wrench, AlertOctagon, MapPin, FileBarChart, Gauge, IdCard } from "lucide-react";

const tabs = [
  { to: "/frota", label: "Dashboard", icon: Gauge, end: true },
  { to: "/frota/veiculos", label: "Veículos", icon: Car },
  { to: "/frota/abastecimentos", label: "Abastecimentos", icon: Fuel },
  { to: "/frota/manutencoes", label: "Manutenções", icon: Wrench },
  { to: "/frota/multas", label: "Multas", icon: AlertOctagon },
  { to: "/frota/postos", label: "Postos", icon: MapPin },
  { to: "/frota/cnh", label: "CNHs", icon: IdCard },
  { to: "/frota/relatorios", label: "Relatórios", icon: FileBarChart },
];

export default function FrotaLayout() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Frota de Veículos</h1>
          <p className="text-sm text-slate-500">Gestão completa: veículos, abastecimentos, manutenção, multas e relatórios.</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
