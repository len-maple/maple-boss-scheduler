export type AnswerType = 'circle' | 'triangle' | 'cross'

export interface DateAnswer {
  type: AnswerType
  // type が 'triangle' の場合のみ使用。00:00始まりの30分コマ index (0-47) の配列。
  slots?: number[]
}

export interface Schedule {
  id: string
  title: string
  bossId: string
  leaderId: string
  candidateDates: string[] // "YYYY-MM-DD"
  status: 'collecting' | 'confirmed'
  confirmedDate: string | null
  confirmedTime: string | null
  createdAt: number
}

export interface MemberResponse {
  memberId: string // = auth uid
  memberName: string
  answers: Record<string, DateAnswer> // key: "YYYY-MM-DD"
  updatedAt: number
}
