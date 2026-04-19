// Helpers para a agenda semanal de logística (semana Seg–Sáb).

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0=Dom, 1=Seg ... 6=Sab
  const diff = dow === 0 ? -6 : 1 - dow; // ancora na segunda
  x.setDate(x.getDate() + diff);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 6 }, (_, i) => addDays(start, i)); // Seg..Sab
}

export function weekRangeLabel(anchor: Date): string {
  const days = weekDays(anchor);
  const first = days[0];
  const last = days[days.length - 1];
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} a ${last.getDate()} de ${months[first.getMonth()]}`;
  }
  return `${first.getDate()} ${months[first.getMonth()]} a ${last.getDate()} ${months[last.getMonth()]}`;
}

export const dayShortNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
