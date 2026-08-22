import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { authReady } from '../firebase'
import { createSchedule, deleteSchedule, listSchedulesByIds } from '../lib/firestore'
import { forgetScheduleId, getMyScheduleIds, rememberScheduleId } from '../lib/localSchedules'
import { findBoss } from '../bosses'
import { isToday, nextOccurrenceDateString, WEEKDAY_LABELS } from '../lib/recurring'
import { formatDateWithWeekday } from '../lib/date'
import type { ConfirmedSlot, Schedule } from '../types'
import BossSelect from '../components/BossSelect'
import BossImage from '../components/BossImage'
import CandidateDateCalendar from '../components/CandidateDateCalendar'
import Card from '../components/Card'

function slotDateTime(slot: ConfirmedSlot): number {
  return new Date(`${slot.date}T${slot.time}:00`).getTime()
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay()
}

function todayDateString(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// 日付だけで判定する(時刻は見ない)。当日中はまだ表示し続け、日付が変わったら非表示にする。
function dropExpiredSlots(schedule: Schedule): Schedule {
  if (schedule.status !== 'confirmed') return schedule
  const today = todayDateString()
  const remaining = schedule.confirmedSlots.filter((slot) => slot.date >= today)
  return { ...schedule, confirmedSlots: remaining }
}

// 確定済みで直近の日程を持つものほど上に来るように並べる。未確定のものはその後ろに作成日時順で並べる。
function compareSchedules(a: Schedule, b: Schedule): number {
  const aTime = earliestUpcomingSlotTime(a)
  const bTime = earliestUpcomingSlotTime(b)
  if (aTime !== null && bTime !== null) return aTime - bTime
  if (aTime !== null) return -1
  if (bTime !== null) return 1
  return b.createdAt - a.createdAt
}

function earliestUpcomingSlotTime(schedule: Schedule): number | null {
  if (schedule.status !== 'confirmed' || schedule.confirmedSlots.length === 0) return null
  return Math.min(...schedule.confirmedSlots.map(slotDateTime))
}

export default function HomePage() {
  const navigate = useNavigate()
  const [bossId, setBossId] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'single' | 'recurring'>('single')
  const [candidateDates, setCandidateDates] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [mySchedules, setMySchedules] = useState<Schedule[]>([])
  const [recurringSchedules, setRecurringSchedules] = useState<Schedule[]>([])
  const [loadingMySchedules, setLoadingMySchedules] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    authReady.then(setUser)
  }, [])

  useEffect(() => {
    const ids = getMyScheduleIds()
    if (ids.length === 0) {
      setLoadingMySchedules(false)
      return
    }
    listSchedulesByIds(ids)
      .then((schedules) => {
        // Firestore側で既に削除済みのIDは、以後も無駄な読み取りが発生し続けないよう記憶から外す。
        const foundIds = new Set(schedules.map((s) => s.id))
        ids.filter((id) => !foundIds.has(id)).forEach(forgetScheduleId)

        // 確定済みの定期スケジュールは、専用の枠で「次回の日付」を計算して表示する。
        // それ以外(未確定の定期スケジュールも含む)は、これまで通りの一覧に表示する。
        const recurring = schedules.filter(
          (s) => s.isRecurring && s.status === 'confirmed' && s.confirmedSlots.length > 0,
        )
        const regular = schedules.filter((s) => !recurring.includes(s))

        const droppedRegular = regular.map(dropExpiredSlots)
        const visible = droppedRegular
          .filter((s) => s.status !== 'confirmed' || s.confirmedSlots.length > 0)
          .sort(compareSchedules)
        setMySchedules(visible)

        // 確定済み(定期を除く)で確定日程が全て過ぎたスケジュールも、以後読み取らないよう記憶から外す。
        droppedRegular
          .filter((s) => s.status === 'confirmed' && s.confirmedSlots.length === 0)
          .forEach((s) => forgetScheduleId(s.id))

        const sortedRecurring = [...recurring].sort((a, b) => {
          const aDate = nextOccurrenceDateString(weekdayOf(a.confirmedSlots[0].date))
          const bDate = nextOccurrenceDateString(weekdayOf(b.confirmedSlots[0].date))
          return aDate.localeCompare(bDate)
        })
        setRecurringSchedules(sortedRecurring)
      })
      .finally(() => setLoadingMySchedules(false))
  }, [])

  function removeCandidateDate(date: string) {
    setCandidateDates(candidateDates.filter((d) => d !== date))
  }

  async function handleDeleteFromHome(scheduleId: string) {
    if (
      !window.confirm('このスケジュールを削除します。メンバーの回答もすべて消え、元に戻せません。よろしいですか？')
    ) {
      return
    }
    setDeletingId(scheduleId)
    try {
      await deleteSchedule(scheduleId)
      forgetScheduleId(scheduleId)
      setMySchedules((prev) => prev.filter((s) => s.id !== scheduleId))
      setRecurringSchedules((prev) => prev.filter((s) => s.id !== scheduleId))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const boss = findBoss(bossId)
    if (!boss || candidateDates.length === 0) return
    setSubmitting(true)
    try {
      const user = await authReady
      const scheduleId = await createSchedule(
        user.uid,
        boss.name,
        boss.id,
        candidateDates,
        scheduleMode === 'recurring',
      )
      rememberScheduleId(scheduleId)
      navigate(`/s/${scheduleId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-4 lg:items-start">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
          <span className="text-base">📋</span>自分が関わったスケジュール
        </h2>
        {loadingMySchedules && <p className="text-sm text-gray-400">読み込み中...</p>}
        {!loadingMySchedules && mySchedules.length === 0 && (
          <p className="text-sm text-gray-400">まだありません</p>
        )}
        <ul className="space-y-2">
          {mySchedules.map((s) => {
            const boss = findBoss(s.bossId)
            const confirmed = s.status === 'confirmed'
            const isLeader = user?.uid === s.leaderId
            return (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/s/${s.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  {boss && <BossImage boss={boss} size={44} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">{s.title}</div>
                    {!confirmed ? (
                      <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        回答受付中
                      </span>
                    ) : s.confirmedSlots.length > 0 ? (
                      <div className="mt-1 flex flex-col gap-1">
                        {s.confirmedSlots.map((slot) => (
                          <span
                            key={`${slot.date}_${slot.time}`}
                            className="inline-block w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          >
                            確定: {formatDateWithWeekday(slot.date)} {slot.time}〜
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        確定済み
                      </span>
                    )}
                  </div>
                </button>
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFromHome(s.id)}
                    disabled={deletingId === s.id}
                    aria-label="このスケジュールを削除"
                    title="このスケジュールを削除"
                    className="shrink-0 rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🗑️
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
          <span className="text-base">🔁</span>定期スケジュール
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          「新しいスケジュールを発行」で定期を選んで確定すると、その曜日・時刻で毎週ここに表示されます。
        </p>
        {loadingMySchedules && <p className="text-sm text-gray-400">読み込み中...</p>}
        {!loadingMySchedules && recurringSchedules.length === 0 && (
          <p className="text-sm text-gray-400">まだありません</p>
        )}
        <ul className="space-y-2">
          {recurringSchedules.map((s) => {
            const boss = findBoss(s.bossId)
            const weekday = weekdayOf(s.confirmedSlots[0].date)
            const time = s.confirmedSlots[0].time
            const occurrence = nextOccurrenceDateString(weekday)
            const today = isToday(occurrence)
            const isLeader = user?.uid === s.leaderId
            return (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/s/${s.id}`)}
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    today ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'
                  }`}
                >
                  {boss && <BossImage boss={boss} size={44} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">{s.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {today && (
                        <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                          本日
                        </span>
                      )}
                      <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        次回: {occurrence}（{WEEKDAY_LABELS[weekday]}）{time}〜
                      </span>
                    </div>
                  </div>
                </button>
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFromHome(s.id)}
                    disabled={deletingId === s.id}
                    aria-label="このスケジュールを削除"
                    title="このスケジュールを削除"
                    className="shrink-0 rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🗑️
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-600">
          <span className="text-base">✨</span>新しいスケジュールを発行
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ボス</label>
            <BossSelect value={bossId} onChange={setBossId} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">種類</label>
            <select
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as 'single' | 'recurring')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="single">単発</option>
              <option value="recurring">定期（毎週）</option>
            </select>
            {scheduleMode === 'recurring' && (
              <p className="mt-1 text-xs text-gray-500">
                確定した日時の曜日・時刻で、以降は自動的に毎週「定期スケジュール」に表示されます。
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              候補日（カレンダーをクリックして選択）
            </label>
            <CandidateDateCalendar selected={candidateDates} onChange={setCandidateDates} />
            {candidateDates.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {candidateDates.map((d) => (
                  <li
                    key={d}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-1 text-sm text-indigo-700 ring-1 ring-indigo-100"
                  >
                    <span>{formatDateWithWeekday(d)}</span>
                    <button
                      type="button"
                      onClick={() => removeCandidateDate(d)}
                      aria-label={`${d}を削除`}
                      className="text-indigo-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !bossId || candidateDates.length === 0}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? '発行中...' : 'スケジュールを発行'}
          </button>
        </form>
      </Card>
    </main>
  )
}
