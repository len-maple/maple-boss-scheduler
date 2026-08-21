import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { authReady } from '../firebase'
import {
  deleteSchedule,
  getMyResponse,
  saveConfirmedSlots,
  subscribeResponses,
  subscribeSchedule,
} from '../lib/firestore'
import { forgetScheduleId, rememberScheduleId } from '../lib/localSchedules'
import { commonAvailableSlots, slotLabel } from '../lib/availability'
import { findBoss } from '../bosses'
import type { AnswerType, ConfirmedSlot, MemberResponse, Schedule } from '../types'
import BossImage from '../components/BossImage'
import Card from '../components/Card'
import ResponseForm from '../components/ResponseForm'

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
    return () => {
      unsubSchedule()
      unsubResponses()
    }
  }, [scheduleId])

  // 自分のホーム画面に「関わったスケジュール」として記憶するかどうかの判定。
  // リーダー本人、またはまだ回答受付中の場合は無条件で記憶する（これから参加する可能性があるため）。
  // すでに確定済みのスケジュールを共有URL経由で見ただけの無関係な人まで記憶してしまわないよう、
  // 確定済みの場合は「過去に一度でも回答したことがある」人だけを記憶する。
  useEffect(() => {
    if (!scheduleId || !user || !schedule) return
    const isLeader = schedule.leaderId === user.uid
    if (isLeader || schedule.status !== 'confirmed') {
      rememberScheduleId(scheduleId)
      return
    }
    getMyResponse(scheduleId, user.uid).then((existing) => {
      if (existing) rememberScheduleId(scheduleId)
    })
  }, [scheduleId, user, schedule?.status, schedule?.leaderId])

  if (!scheduleId) return null
  if (schedule === undefined || !user) {
    return <p className="p-6 text-gray-400">読み込み中...</p>
  }
  if (schedule === null) {
    return <p className="p-6 text-red-500">スケジュールが見つかりませんでした。</p>
  }

  const isLeader = schedule.leaderId === user.uid
  const boss = findBoss(schedule.bossId)

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-indigo-100 backdrop-blur">
        {boss && <BossImage boss={boss} size={56} />}
        <h1 className="text-xl font-bold text-gray-900">{schedule.title}</h1>
        {schedule.isRecurring && (
          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
            🔁 定期
          </span>
        )}
      </div>

      {isLeader ? (
        <LeaderView schedule={schedule} responses={responses} />
      ) : schedule.status === 'confirmed' ? (
        <ConfirmedView schedule={schedule} />
      ) : (
        <MemberView schedule={schedule} userId={user.uid} />
      )}
    </main>
  )
}

function ConfirmedView({ schedule }: { schedule: Schedule }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg shadow-emerald-100">
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-400" />
      <div className="p-8 text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 text-sm font-medium text-emerald-700">
          {schedule.confirmedSlots.length > 1 ? '開催日時が確定しました（複数日程）' : '開催日時が確定しました'}
        </p>
        <div className="mt-3 space-y-2">
          {schedule.confirmedSlots.map((slot) => (
            <p key={`${slot.date}_${slot.time}`} className="text-2xl font-bold text-emerald-800">
              {slot.date} {slot.time}〜
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

function MemberView({ schedule, userId }: { schedule: Schedule; userId: string }) {
  const navigate = useNavigate()
  const [justSaved, setJustSaved] = useState(false)

  return (
    <Card>
      <ResponseForm schedule={schedule} userId={userId} onSaved={() => setJustSaved(true)} />

      {justSaved && (
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-3 w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
        >
          一覧に戻る
        </button>
      )}
    </Card>
  )
}

function LeaderView({
  schedule,
  responses,
}: {
  schedule: Schedule
  responses: MemberResponse[]
}) {
  const navigate = useNavigate()
  const [confirmDate, setConfirmDate] = useState(schedule.candidateDates[0] ?? '')
  const [confirmTime, setConfirmTime] = useState('21:00')
  // 確定日程は複数登録できるようにするため、Firestoreへ保存する前にここで一覧を組み立てる。
  const [stagedSlots, setStagedSlots] = useState<ConfirmedSlot[]>(schedule.confirmedSlots)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('このスケジュールを削除します。メンバーの回答もすべて消え、元に戻せません。よろしいですか？')) {
      return
    }
    setDeleting(true)
    try {
      await deleteSchedule(schedule.id)
      forgetScheduleId(schedule.id)
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    setStagedSlots(schedule.confirmedSlots)
    // スケジュールIDが変わる場合はない前提だが、他端末での更新を拾えるようslotsのシリアライズも見る。
  }, [schedule.id, JSON.stringify(schedule.confirmedSlots)])

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

  function addStagedSlot() {
    if (!confirmDate || !confirmTime) return
    if (stagedSlots.some((s) => s.date === confirmDate && s.time === confirmTime)) return
    setStagedSlots(
      [...stagedSlots, { date: confirmDate, time: confirmTime }].sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
      ),
    )
  }

  function removeStagedSlot(date: string, time: string) {
    setStagedSlots(stagedSlots.filter((s) => !(s.date === date && s.time === time)))
  }

  const isDirty = JSON.stringify(stagedSlots) !== JSON.stringify(schedule.confirmedSlots)

  async function handleSaveConfirmed() {
    setSaving(true)
    try {
      await saveConfirmedSlots(schedule.id, stagedSlots)
    } finally {
      setSaving(false)
    }
  }

  const shareUrl = window.location.href

  return (
    <div className="space-y-6">
      <Card>
        <p className="mb-2 text-sm font-medium text-gray-700">このURLをメンバーに共有してください</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
          >
            コピー
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
          <span className="text-base">📝</span>自分の回答
        </h2>
        <ResponseForm schedule={schedule} userId={schedule.leaderId} />
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
          <span className="text-base">📊</span>回答状況
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-gray-100 p-2 text-left text-gray-500">候補日</th>
                {responses.map((r) => (
                  <th key={r.memberId} className="border-b border-gray-100 p-2 text-left text-gray-500">
                    {r.memberName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.candidateDates.map((date) => (
                <tr key={date}>
                  <td className="border-b border-gray-50 p-2 font-medium text-gray-900">{date}</td>
                  {responses.map((r) => {
                    const answer = r.answers[date]
                    return (
                      <td key={r.memberId} className="border-b border-gray-50 p-2">
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
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
          <span className="text-base">🗓️</span>開催日時を確定する
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          複数の日程を確定したい場合は、日時を選んで「日程に追加」を繰り返してから保存してください。
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700">日付</label>
            <select
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {schedule.candidateDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">開始時刻</label>
            {hasAvailabilityInfo ? (
              <select
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
                disabled={availableTimeOptions.length === 0}
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                className="rounded-lg border border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            )}
          </div>
          <button
            type="button"
            onClick={addStagedSlot}
            disabled={!confirmTime}
            className="rounded-lg bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ＋ 日程に追加
          </button>
        </div>
        {hasAvailabilityInfo && (
          <p className="mt-3 text-xs text-gray-500">
            {availableTimeOptions.length > 0
              ? '○/△の回答から、全員の都合が重なる時間帯だけを表示しています。'
              : '○/△の回答が重なる時間帯がありません。候補日か回答内容を見直してください。'}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {stagedSlots.length === 0 && (
            <p className="text-sm text-gray-400">確定日程はまだ追加されていません。</p>
          )}
          {stagedSlots.map((slot) => (
            <div
              key={`${slot.date}_${slot.time}`}
              className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              <span className="font-medium">
                {slot.date} {slot.time}〜
              </span>
              <button
                type="button"
                onClick={() => removeStagedSlot(slot.date, slot.time)}
                className="text-emerald-500 hover:text-red-500"
                aria-label="この日程を削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveConfirmed}
          disabled={saving || !isDirty}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {saving
            ? '保存中...'
            : stagedSlots.length === 0
              ? '未確定に戻す'
              : `この${stagedSlots.length}件の日程で確定する`}
        </button>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-500">
          <span className="text-base">⚠️</span>危険な操作
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          このスケジュールとメンバー全員の回答を完全に削除します。元に戻せません。
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? '削除中...' : 'このスケジュールを削除する'}
        </button>
      </Card>
    </div>
  )
}
