export interface Boss {
  id: string
  name: string
  // public/bosses/ 配下の画像ファイル名。実ファイルは著作権の関係でリポジトリに同梱していない。
  // docs/adding-boss-images.md を参照して各自で用意してください。
  image: string
}

export const BOSS_LIST: Boss[] = [
  { id: 'guardian-angel-slime', name: 'ガーディアンエンジェルスライム ガエン', image: '/bosses/guardian-angel-slime.png' },
  { id: 'lotus', name: 'スウ', image: '/bosses/lotus.png' },
  { id: 'damien', name: 'デミアン', image: '/bosses/damien.png' },
  { id: 'lucid', name: 'ルシード', image: '/bosses/lucid.png' },
  { id: 'will', name: 'ウィル', image: '/bosses/will.png' },
  { id: 'dusk', name: 'ダスク', image: '/bosses/dusk.png' },
  { id: 'dunkel', name: 'デュンケル', image: '/bosses/dunkel.png' },
  { id: 'hilla', name: '真・ヒルラ', image: '/bosses/hilla.png' },
  { id: 'black-mage', name: '暗黒の魔法使い', image: '/bosses/black-mage.png' },
  { id: 'first-adversary', name: '最初の対敵者', image: '/bosses/first-adversary.png' },
  { id: 'seren', name: 'セレン', image: '/bosses/seren.png' },
  { id: 'kalos', name: 'カロス', image: '/bosses/kalos.png' },
  { id: 'kaling', name: 'カリーン', image: '/bosses/kaling.png' },
  { id: 'marisha', name: 'マリシャ', image: '/bosses/marisha.png' },
  { id: 'limbo', name: 'リンボ', image: '/bosses/limbo.png' },
  { id: 'baldrix', name: 'バルドリックス', image: '/bosses/baldrix.png' },
  { id: 'kai', name: 'カイ', image: '/bosses/kai.png' },
  { id: 'malefic-star', name: '燦爛たる凶星', image: '/bosses/malefic-star.png' },
  { id: 'jupiter', name: 'ユピテル', image: '/bosses/jupiter.png' },
  { id: 'verona', name: 'ベローナ', image: '/bosses/verona.png' },
  { id: 'meilin', name: 'メイリン', image: '/bosses/meilin.png' },
]

export function findBoss(bossId: string | undefined | null): Boss | undefined {
  if (!bossId) return undefined
  return BOSS_LIST.find((b) => b.id === bossId)
}
