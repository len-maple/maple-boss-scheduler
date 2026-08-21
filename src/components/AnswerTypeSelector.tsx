import type { AnswerType } from '../types'

const OPTIONS: { type: AnswerType; label: string; selectedClass: string }[] = [
  { type: 'circle', label: '○', selectedClass: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white border-emerald-500 shadow-md shadow-emerald-200' },
  { type: 'triangle', label: '△', selectedClass: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-500 shadow-md shadow-amber-200' },
  { type: 'cross', label: '×', selectedClass: 'bg-gradient-to-br from-rose-400 to-red-500 text-white border-rose-500 shadow-md shadow-rose-200' },
]

interface AnswerTypeSelectorProps {
  value: AnswerType | undefined
  onChange: (type: AnswerType) => void
}

export default function AnswerTypeSelector({ value, onChange }: AnswerTypeSelectorProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onChange(opt.type)}
          className={`h-9 w-9 rounded-full border text-lg font-bold transition-all ${
            value === opt.type
              ? opt.selectedClass
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
