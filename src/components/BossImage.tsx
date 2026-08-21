import { useState } from 'react'
import type { Boss } from '../bosses'

interface BossImageProps {
  boss: Boss
  size?: number
}

// public/bosses/ に実画像が無い場合は頭文字のプレースホルダーにフォールバックする。
// docs/adding-boss-images.md 参照。
export default function BossImage({ boss, size = 64 }: BossImageProps) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (failed) {
    return (
      <div
        style={style}
        className="flex items-center justify-center rounded-lg bg-gray-200 text-lg font-bold text-gray-500"
      >
        {boss.name.charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}${boss.image}`}
      alt={boss.name}
      style={style}
      className="rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  )
}
