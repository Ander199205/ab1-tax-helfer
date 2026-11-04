// Utilidades de fechas. Las fechas de la app se guardan en hora local:
//   - día:        "YYYY-MM-DD"
//   - día y hora: "YYYY-MM-DDTHH:mm" (lo que devuelve <input type="datetime-local">)

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha y hora local actual en formato "YYYY-MM-DDTHH:mm". */
export function nowLocal(date = new Date()): string {
  return `${todayLocal(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Día local actual en formato "YYYY-MM-DD". */
export function todayLocal(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Comprueba el formato y que el día exista (rechaza, por ejemplo, el 30 de febrero). */
export function isValidDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && todayLocal(parseDay(value)) === value;
}

/** Convierte "YYYY-MM-DD" en una fecha local (sin desfase de zona horaria). */
export function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isPast(scheduledAt: string | null, now = new Date()): boolean {
  if (!scheduledAt) return false;
  return new Date(scheduledAt).getTime() < now.getTime();
}

/** "Mi., 22.10.2026, 18:00" */
export function formatDateTime(scheduledAt: string | null): string {
  if (!scheduledAt) return "Kein Datum";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(scheduledAt));
}

/** "22.10.2026" a partir de "YYYY-MM-DD" (formato alemán). */
export function formatDay(day: string | null): string {
  if (!day) return "Kein Datum";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    parseDay(day),
  );
}

/** Suma días a un "YYYY-MM-DD". */
export function addDays(day: string, amount: number): string {
  const date = parseDay(day);
  date.setDate(date.getDate() + amount);
  return todayLocal(date);
}
