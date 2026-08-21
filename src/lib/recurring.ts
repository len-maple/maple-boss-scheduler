export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 指定した曜日の「今週(まだ来ていなければ今日を含む)」の発生日を求める。
// 時刻は無視し、日付だけで判定する(その日のうちは何時でも「今日」の回として扱う)。
export function nextOccurrenceDate(weekday: number, now: Date = new Date()): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let diff = weekday - today.getDay()
  if (diff < 0) diff += 7
  today.setDate(today.getDate() + diff)
  return today
}

export function nextOccurrenceDateString(weekday: number, now: Date = new Date()): string {
  return formatDate(nextOccurrenceDate(weekday, now))
}

export function isToday(dateString: string, now: Date = new Date()): boolean {
  return dateString === formatDate(now)
}
