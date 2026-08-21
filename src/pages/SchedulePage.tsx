import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { authReady } from '../firebase'
import {
  confirmSchedule,
  getMyResponse,
  subscribeResponses,
  subscribeSchedule,
  upsertResponse,
} from '../lib/firestore'
import { rememberScheduleId } from '../lib/localSchedules'
import { commonAvailableSlots, slotLabel } from '../lib/availability'
import { findBoss } from '../bosses'
import type { AnswerType, DateAnswer, MemberResponse, Schedule } from '../types'
import AnswerTypeSelector from '../components/AnswerTypeSelector'
import TimeGridPicker from '../components/TimeGridPicker'
import BossImage from '../components/BossImage'

const ANSWER_LABEL: Record<AnswerType, string> = {
  circle: '○',
  triangle: '△',
  cross: '×',
}

export default function SchedulePage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null | undefined>(undefined)
  const [responses, setResponses] = useState<MemberResponse[]>([])

  useEffect(() => {
    authReady.then(setUser)
  }, [])

  useEffect(() => {
    if (!scheduleId) return
    const unsubSchedule = subscribeSchedule(scheduleId, setSchedule)
    const unsubResponses = subscribeResponses(scheduleId, setResponses)
    rememberScheduleId(scheduleId)
    return () => {
      unsubSchedule()
      unsubResponses()
    }
  }, [scheduleId])

  if (!scheduleId) return null
  if (schedule === undefined || !user) {
    return <p className="p-4 text-gray-400">読み込み中...</p>
  }
  if (schedule === null) {
    return <p className="p-4 text-red-500">スケジュールが見つかりませんでした。</p>
  }

  const isLeader = schedule.leaderId === user.uid
  const boss = findBoss(schedule.bossId)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center gap-3">
        {boss && <BossImage boss={boss} size={48} />}
        <h1 className="text-xl font-bold">{schedule.title}</h1>
      </div>

      {schedule.status === 'confirmed' ? (
        <ConfirmedView schedule={schedule} />
      ) : isLeader ? (
        <LeaderView schedule={schedule} responses={responses} />
      ) : (
        <MemberView schedule={schedule} userId={user.uid} />
      )}
    </div>
  )
}

function ConfirmedView({ schedule }: { schedule: Schedule }) {
  return (
    <div className="rounded border border-emerald-300 bg-emerald-50 p-6 text-center">
      <p className="text-sm text-emerald-700">開催日時が確定しました</p>
      <p className="mt-2 text-2xl font-bold text-emerald-800">
        {schedule.confirmedDate} {schedule.confirmedTime}〜
      </p>
    </div>
  )
}

function MemberView({ schedule, userId }: { schedule: Schedule; userId: string }) {
  const [memberName, setMemberName] = useState('')
  const [answers, setAnswers] = useState<Record<string, DateAnswer>>({})
  const [openTimePickerDate, setOpenTimePickerDate] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMyResponse(schedule.id, userId).then((existing) => {
      if (existing) {
        setMemberName(existing.memberName)
        setAnswers(existing.answers)
      }
      setLoaded(true)
    })
  }, [schedule.id, userId])

  function setAnswerType(date: string, type: AnswerType) {
    setAnswers((prev) => ({ ...prev, [date]: { type, slots: prev[date]?.slots ?? [] } }))
    setSaved(false)
    if (type === 'triangle') {
      setOpenTimePickerDate(date)
    }
  }

  function setSlots(date: string, slots: number[]) {
    setAnswers((prev) => ({ ...prev, [date]: { type: 'triangle', slots } }))
    setSaved(false)
  }

  async function handleSave() {
    if (!memberName.trim()) return
    setSaving(true)
    try {
      await upsertResponse(schedule.id, userId, memberName.trim(), answers)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="text-gray-400">読み込み中...</p>

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm">名前</label>
        <input
          type="text"
          value={memberName}
          onChange={(e) => {
            setMemberName(e.target.value)
            setSaved(false)
          }}
          placeholder="表示される名前を入力"
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div className="space-y-3">
        {schedule.candidateDates.map((date) => (
          <div key={date} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{date}</span>
              <AnswerTypeSelector
                value={answers[date]?.type}
                onChange={(type) => setAnswerType(date, type)}
              />
            </div>
            {answers[date]?.type === 'triangle' && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() =>
                    setOpenTimePickerDate(openTimePickerDate === date ? null : date)
                  }
                >
                  参加可能な時間を選択（{answers[date]?.slots?.length ?? 0} コマ選択中）
                </button>
                {openTimePickerDate === date && (
                  <div className="mt-2">
                    <TimeGridPicker
                      selected={answers[date]?.slots ?? []}
                      onChange={(slots) => setSlots(date, slots)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !memberName.trim()}
        className="w-full rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {saving ? '保存中...' : saved ? '保存しました' : '回答を保存'}
      </button>
    </div>
  )
}

function LeaderView({
  schedule,
  responses,
}: {
  schedule: Schedule
  responses: MemberResponse[]
}) {
  const [confirmDate, setConfirmDate] = useState(schedule.candidateDates[0] ?? '')
  const [confirmTime, setConfirmTime] = useState('21:00')
  const [confirming, setConfirming] = useState(false)

  // ○/△の回答から、選んだ候補日で全員の都合が重なる時間帯を求める。
  // ×は不参加の意思表示として計算から除外する（docs/implementation-plan.md 参照）。
  const hasAvailabilityInfo = responses.some(
    (r) => r.answers[confirmDate] && r.answers[confirmDate].type !== 'cross',
  )
  const availableSlots = useMemo(
    () => commonAvailableSlots(responses, confirmDate),
    [responses, confirmDate],
  )
  const availableTimeOptions = availableSlots.map(slotLabel)

  useEffect(() => {
    if (!hasAvailabilityInfo) return
    if (!availableTimeOptions.includes(confirmTime)) {
      setConfirmTime(availableTimeOptions[0] ?? '')
    }
  }, [confirmDate, hasAvailabilityInfo, availableTimeOptions.join(',')])

  async function handleConfirm() {
    if (!confirmDate || !confirmTime) return
    setConfirming(true)
    try {
      await confirmSchedule(schedule.id, confirmDate, confirmTime)
    } finally {
      setConfirming(false)
    }
  }

  const shareUrl = window.location.href

  return (
    <div className="space-y-6">
      <div className="rounded border bg-gray-50 p-3">
        <p className="mb-1 text-sm text-gray-500">このURLをメンバーに共有してください</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded border bg-white px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
          >
            コピー
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-2 text-left">候補日</th>
              {responses.map((r) => (
                <th key={r.memberId} className="border-b p-2 text-left">
                  {r.memberName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.candidateDates.map((date) => (
              <tr key={date}>
                <td className="border-b p-2 font-medium">{date}</td>
                {responses.map((r) => {
                  const answer = r.answers[date]
                  return (
                    <td key={r.memberId} className="border-b p-2">
                      {answer ? (
                        <span>
                          {ANSWER_LABEL[answer.type]}
                          {answer.type === 'triangle' && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({answer.slots?.length ?? 0}コマ)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300">未回答</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {responses.length === 0 && (
          <p className="mt-2 text-sm text-gray-400">まだ誰も回答していません。</p>
        )}
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-3 font-semibold">開催日時を確定する</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm">日付</label>
            <select
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
              className="rounded border px-3 py-2"
            >
              {schedule.candidateDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">開始時刻</label>
            {hasAvailabilityInfo ? (
              <select
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                disabled={availableTimeOptions.length === 0}
                className="rounded border px-3 py-2"
              >
                {availableTimeOptions.length === 0 ? (
                  <option value="">選択肢なし</option>
                ) : (
                  availableTimeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <input
                type="time"
                step={60}
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                className="rounded border px-3 py-2"
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || !confirmTime}
            className="rounded bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {confirming ? '確定中...' : 'この日時で確定'}
          </button>
        </div>
        {hasAvailabilityInfo && (
          <p className="mt-2 text-xs text-gray-500">
            {availableTimeOptions.length > 0
              ? '○/△の回答から、全員の都合が重なる時間帯だけを表示しています。'
              : '○/△の回答が重なる時間帯がありません。候補日か回答内容を見直してください。'}
          </p>
        )}
      </div>
    </div>
  )
}
