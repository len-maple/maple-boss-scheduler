import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authReady } from '../firebase'
import { createSchedule, listSchedulesByIds } from '../lib/firestore'
import { getMyScheduleIds, rememberScheduleId } from '../lib/localSchedules'
import { findBoss } from '../bosses'
import type { Schedule } from '../types'
import BossSelect from '../components/BossSelect'
import BossImage from '../components/BossImage'
import CandidateDateCalendar from '../components/CandidateDateCalendar'

export default function HomePage() {
  const navigate = useNavigate()
  const [bossId, setBossId] = useState('')
  const [candidateDates, setCandidateDates] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [mySchedules, setMySchedules] = useState<Schedule[]>([])
  const [loadingMySchedules, setLoadingMySchedules] = useState(true)

  useEffect(() => {
    const ids = getMyScheduleIds()
    if (ids.length === 0) {
      setLoadingMySchedules(false)
      return
    }
    listSchedulesByIds(ids)
      .then((schedules) => {
        setMySchedules(schedules.sort((a, b) => b.createdAt - a.createdAt))
      })
      .finally(() => setLoadingMySchedules(false))
  }, [])

  function removeCandidateDate(date: string) {
    setCandidateDates(candidateDates.filter((d) => d !== date))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const boss = findBoss(bossId)
    if (!boss || candidateDates.length === 0) return
    setSubmitting(true)
    try {
      const user = await authReady
      const scheduleId = await createSchedule(user.uid, boss.name, boss.id, candidateDates)
      rememberScheduleId(scheduleId)
      navigate(`/s/${scheduleId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-6 text-xl font-bold">ボススケジューラー</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-gray-500">自分が関わったスケジュール</h2>
        {loadingMySchedules && <p className="text-sm text-gray-400">読み込み中...</p>}
        {!loadingMySchedules && mySchedules.length === 0 && (
          <p className="text-sm text-gray-400">まだありません</p>
        )}
        <ul className="space-y-2">
          {mySchedules.map((s) => {
            const boss = findBoss(s.bossId)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/s/${s.id}`)}
                  className="flex w-full items-center gap-3 rounded border p-3 text-left hover:bg-gray-50"
                >
                  {boss && <BossImage boss={boss} size={40} />}
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-gray-500">
                      {s.status === 'confirmed' ? (
                        <>
                          確定済み: {s.confirmedDate} {s.confirmedTime}〜
                        </>
                      ) : (
                        '回答受付中'
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">新しいスケジュールを発行</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">ボス</label>
            <BossSelect value={bossId} onChange={setBossId} />
          </div>

          <div>
            <label className="mb-1 block text-sm">候補日（カレンダーをクリックして選択）</label>
            <CandidateDateCalendar selected={candidateDates} onChange={setCandidateDates} />
            {candidateDates.length > 0 && (
              <ul className="mt-2 space-y-1">
                {candidateDates.map((d) => (
                  <li key={d} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1">
                    <span>{d}</span>
                    <button
                      type="button"
                      onClick={() => removeCandidateDate(d)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !bossId || candidateDates.length === 0}
            className="w-full rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {submitting ? '発行中...' : 'スケジュールを発行'}
          </button>
        </form>
      </section>
    </div>
  )
}
