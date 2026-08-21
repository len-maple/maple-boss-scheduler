import type { DateAnswer, MemberResponse } from '../types'

export const SLOT_COUNT = 48 // 00:00〜24:00 を30分刻みで48コマ

export function slotLabel(index: number): string {
  const totalMinutes = index * 30
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const ALL_SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i)

// 指定した候補日について、○/△の回答をもとに全員が参加できる30分コマの共通部分を求める。
// ○は終日参加可能（全コマ）として扱い、△は本人が選択したコマのみとして扱う。
// ×は「その日は不参加」という意思表示なので、共通部分の計算からは除外する
// （×がいるからといって候補時間がゼロになってしまうのを避けるため）。
// ○/△の回答が一つも無い場合は、まだ制約となる情報が無いので全コマを返す。
export function commonAvailableSlots(responses: MemberResponse[], date: string): number[] {
  const relevant: DateAnswer[] = []
  for (const r of responses) {
    const answer = r.answers[date]
    if (answer && answer.type !== 'cross') relevant.push(answer)
  }

  if (relevant.length === 0) return ALL_SLOTS

  let common: number[] = ALL_SLOTS
  for (const answer of relevant) {
    const slots: number[] = answer.type === 'circle' ? ALL_SLOTS : (answer.slots ?? [])
    const slotSet = new Set(slots)
    common = common.filter((s) => slotSet.has(s))
  }
  return [...common].sort((a, b) => a - b)
}
