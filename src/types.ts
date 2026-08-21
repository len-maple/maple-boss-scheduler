export type AnswerType = 'circle' | 'triangle' | 'cross'

export interface DateAnswer {
  type: AnswerType
  // type が 'triangle' の場合のみ使用。00:00始まりの30分コマ index (0-47) の配列。
  slots?: number[]
}

export interface ConfirmedSlot {
  date: string // "YYYY-MM-DD"
  time: string // "HH:MM"
}

export interface Schedule {
  id: string
  title: string
  bossId: string
  leaderId: string
  candidateDates: string[] // "YYYY-MM-DD"
  status: 'collecting' | 'confirmed'
  // 確定した開催日時。複数の日程を確定できるようにするため配列にしている。
  confirmedSlots: ConfirmedSlot[]
  // true の場合、確定した日程の曜日・時刻を使って毎週同じ曜日に繰り返す
  // 「定期スケジュール」として扱う(lib/recurring.ts 参照)。候補日選定〜確定の流れは通常と同じ。
  isRecurring: boolean
  createdAt: number
}

export interface MemberResponse {
  memberId: string // = auth uid
  memberName: string
  answers: Record<string, DateAnswer> // key: "YYYY-MM-DD"
  updatedAt: number
}
