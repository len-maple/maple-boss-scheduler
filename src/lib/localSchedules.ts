const STORAGE_KEY = 'myScheduleIds'

// ログイン機能を持たないため、自分が関わった（作成 or 回答した）スケジュールIDを
// ブラウザの localStorage に控えておき、トップページの一覧表示に使う。
// 同一ブラウザ・同一端末でのみ有効（docs/implementation-plan.md §3.5, §5.1 参照）。
export function rememberScheduleId(scheduleId: string): void {
  const ids = getMyScheduleIds()
  if (!ids.includes(scheduleId)) {
    ids.push(scheduleId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }
}

export function forgetScheduleId(scheduleId: string): void {
  const ids = getMyScheduleIds().filter((id) => id !== scheduleId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function getMyScheduleIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
