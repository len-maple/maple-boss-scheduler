import { useState } from 'react'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function todayString(): string {
  const now = new Date()
  return formatDate(now.getFullYear(), now.getMonth(), now.getDate())
}

interface CandidateDateCalendarProps {
  selected: string[]
  onChange: (dates: string[]) => void
}

// カレンダーを表示し、日付をクリックすると候補日として追加/解除できるようにする。
export default function CandidateDateCalendar({ selected, onChange }: CandidateDateCalendarProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-indexed

  const selectedSet = new Set(selected)
  const today = todayString()

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function toggleDate(day: number) {
    const dateStr = formatDate(viewYear, viewMonth, day)
    if (dateStr < today) return
    const next = new Set(selectedSet)
    if (next.has(dateStr)) {
      next.delete(dateStr)
    } else {
      next.add(dateStr)
    }
    onChange(Array.from(next).sort())
  }

  return (
    <div className="rounded border p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={goToPrevMonth} className="rounded px-2 py-1 hover:bg-gray-100">
          ＜
        </button>
        <span className="font-medium">
          {viewYear}年 {viewMonth + 1}月
        </span>
        <button type="button" onClick={goToNextMonth} className="rounded px-2 py-1 hover:bg-gray-100">
          ＞
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const dateStr = formatDate(viewYear, viewMonth, day)
          const isSelected = selectedSet.has(dateStr)
          const isPast = dateStr < today
          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              onClick={() => toggleDate(day)}
              className={`rounded py-2 text-sm transition-colors ${
                isPast
                  ? 'cursor-not-allowed text-gray-300'
                  : isSelected
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
