import { useRef, useState, type PointerEvent } from 'react'
import { SLOT_COUNT, slotLabel } from '../lib/availability'

interface TimeGridPickerProps {
  selected: number[]
  onChange: (slots: number[]) => void
}

// 00:00-24:00 を30分単位・48コマのボタングリッドで表示し、
// クリックで単発トグル、ドラッグ（長押しして動かす）で連続選択できるようにする。
// マウス・タッチの両方を Pointer Events で統一して扱う。
export default function TimeGridPicker({ selected, onChange }: TimeGridPickerProps) {
  const selectedSet = new Set(selected)
  const draggingRef = useRef(false)
  const paintValueRef = useRef(true) // ドラッグ中に ON にするか OFF にするか
  const visitedRef = useRef<Set<number>>(new Set())
  const [dragging, setDragging] = useState(false)

  function applySlot(index: number, value: boolean) {
    const next = new Set(selectedSet)
    if (value) {
      next.add(index)
    } else {
      next.delete(index)
    }
    onChange(Array.from(next).sort((a, b) => a - b))
  }

  function handlePointerDown(index: number, e: PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const newValue = !selectedSet.has(index)
    paintValueRef.current = newValue
    draggingRef.current = true
    visitedRef.current = new Set([index])
    setDragging(true)
    applySlot(index, newValue)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const indexAttr = el?.dataset?.slotIndex
    if (indexAttr === undefined) return
    const index = Number(indexAttr)
    if (visitedRef.current.has(index)) return
    visitedRef.current.add(index)
    applySlot(index, paintValueRef.current)
  }

  function handlePointerUp() {
    draggingRef.current = false
    setDragging(false)
    visitedRef.current = new Set()
  }

  return (
    <div>
      <div
        className="grid grid-cols-6 gap-1 select-none sm:grid-cols-8"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {Array.from({ length: SLOT_COUNT }, (_, index) => {
          const isSelected = selectedSet.has(index)
          return (
            <button
              key={index}
              type="button"
              data-slot-index={index}
              onPointerDown={(e) => handlePointerDown(index, e)}
              className={`rounded-lg border px-1 py-2 font-mono text-xs transition-all ${
                isSelected
                  ? 'border-amber-500 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-200'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-amber-50'
              }`}
            >
              {slotLabel(index)}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 text-sm">
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-gray-100"
          onClick={() => onChange(Array.from({ length: SLOT_COUNT }, (_, i) => i))}
        >
          全選択
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-gray-100"
          onClick={() => onChange([])}
        >
          全解除
        </button>
        {dragging && <span className="text-gray-400">ドラッグ選択中...</span>}
      </div>
    </div>
  )
}
