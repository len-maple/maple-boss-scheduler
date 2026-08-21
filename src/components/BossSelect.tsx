import { BOSS_LIST, findBoss } from '../bosses'
import BossImage from './BossImage'

interface BossSelectProps {
  value: string
  onChange: (bossId: string) => void
}

export default function BossSelect({ value, onChange }: BossSelectProps) {
  const selectedBoss = findBoss(value)

  return (
    <div className="flex items-center gap-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border px-3 py-2"
      >
        <option value="">選択してください</option>
        {BOSS_LIST.map((boss) => (
          <option key={boss.id} value={boss.id}>
            {boss.name}
          </option>
        ))}
      </select>
      {selectedBoss && <BossImage boss={selectedBoss} size={48} />}
    </div>
  )
}
