import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Target,
  MessageCircle,
  ClipboardList,
  DollarSign,
  Clock,
  ClipboardCheck,
  Truck,
  Package,
  BookOpen,
  Camera,
  Calendar,
  Send,
  BarChart3,
  Home,
} from "lucide-react";
import type { BottomNavItem, MobileRole } from "./types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Home,
  Users,
  FileText,
  Target,
  MessageCircle,
  ClipboardList,
  DollarSign,
  Clock,
  ClipboardCheck,
  Truck,
  Package,
  BookOpen,
  Camera,
  Calendar,
  Send,
  BarChart3,
};

interface BottomNavProps {
  items: BottomNavItem[];
  role: MobileRole;
}

export function BottomNav({ items, role }: BottomNavProps) {
  const location = useLocation();

  return (
    <>
      {/* Tablet / desktop bottom nav (hidden on small mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 hidden md:flex md:bottom-0 md:top-auto md:h-16 md:border-t md:border-slate-200 md:bg-white md:shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-full w-full max-w-2xl items-center justify-around px-2">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive = location.pathname === item.path ||
              (item.path !== `/mobile/${role}` && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5
                  min-w-[56px] transition-all duration-150
                  ${isActive
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                  }
                `}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.badge && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {item.badge === "count" ? "·" : item.badge === "unread" ? "·" : ""}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-blue-600" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav (safe area aware) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        <div className="flex h-[60px] w-full items-center justify-around border-t border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive = location.pathname === item.path ||
              (item.path !== `/mobile/${role}` && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5 px-3 py-1
                  min-w-[56px] transition-all duration-150 active:scale-90
                  ${isActive ? "text-blue-600" : "text-slate-400"}
                `}
              >
                <div className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.badge && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {item.badge === "count" ? "·" : item.badge === "unread" ? "·" : "1"}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-blue-600" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}