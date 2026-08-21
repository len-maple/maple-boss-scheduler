import { WEEKDAY_LABELS } from './recurring'

// "2026-08-22" -> "2026-08-22(土)"
export function formatDateWithWeekday(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).getDay()
  return `${dateStr}(${WEEKDAY_LABELS[weekday]})`
}
