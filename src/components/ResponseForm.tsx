import { useEffect, useState } from 'react'
import { getMyResponse, upsertResponse } from '../lib/firestore'
import { formatDateWithWeekday } from '../lib/date'
import type { AnswerType, DateAnswer, Schedule } from '../types'
import AnswerTypeSelector from './AnswerTypeSelector'
import TimeGridPicker from './TimeGridPicker'

interface ResponseFormProps {
  schedule: Schedule
  userId: string
  onSaved?: () => void
}

// メンバー・リーダーの両方が使う、候補日ごとの○/△/×回答入力フォーム。
export default function ResponseForm({ schedule, userId, onSaved }: ResponseFormProps) {
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
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="text-gray-400">読み込み中...</p>

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={memberName}
          onChange={(e) => {
            setMemberName(e.target.value)
            setSaved(false)
          }}
          placeholder="表示される名前を入力"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
        <span>
          <span className="font-bold text-emerald-600">○</span> = 終日OK
        </span>
        <span>
          <span className="font-bold text-amber-600">△</span> = 時間指定
        </span>
        <span>
          <span className="font-bold text-rose-600">×</span> = 終日不可
        </span>
      </div>

      <div className="space-y-3">
        {schedule.candidateDates.map((date) => (
          <div key={date} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{formatDateWithWeekday(date)}</span>
              <AnswerTypeSelector
                value={answers[date]?.type}
                onChange={(type) => setAnswerType(date, type)}
              />
            </div>
            {answers[date]?.type === 'triangle' && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:underline"
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
        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {saving ? '保存中...' : saved ? '保存しました' : '回答を保存'}
      </button>
    </div>
  )
}
