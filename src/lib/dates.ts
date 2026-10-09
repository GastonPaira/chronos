// Fechas como claves "YYYY-MM-DD" en la hora LOCAL del jugador.
// Antes se usaba toISOString(), que da la fecha en UTC: en Argentina, después de las 21 h ya era "mañana".

/** Returns the local calendar date of `date` as `YYYY-MM-DD`. */
export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns the local calendar date of the day before `date` as `YYYY-MM-DD`. */
export function toPreviousLocalDateKey(date: Date = new Date()): string {
  const previous = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return toLocalDateKey(previous);
}
