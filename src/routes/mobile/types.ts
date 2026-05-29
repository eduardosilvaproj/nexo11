export interface RouteConfig {
  path: string;
  element: string;
  label: string;
  icon: string;
  badge?: string;
}

export type MobileRole = "vendedor" | "medidor" | "conferente" | "montador" | "entregue" | "admin";

export interface BottomNavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}