import type { AnswerType } from '../types'

const OPTIONS: { type: AnswerType; label: string }[] = [
  { type: 'circle', label: '○' },
  { type: 'triangle', label: '△' },
  { type: 'cross', label: '×' },
]

interface AnswerTypeSelectorProps {
  value: AnswerType | undefined
  onChange: (type: AnswerType) => void
}

export default function AnswerTypeSelector({ value, onChange }: AnswerTypeSelectorProps) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onChange(opt.type)}
          className={`h-9 w-9 rounded-full text-lg font-bold border transition-colors ${
            value === opt.type
              ? 'bg-blue-500 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
