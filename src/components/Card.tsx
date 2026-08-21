import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

// アプリ全体で使う共通カード。上部にグラデーションのアクセントバーを付けて
// 白背景だけの寂しい見た目にならないようにする。
export default function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-lg shadow-indigo-100 backdrop-blur ${className}`}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500" />
      <div className="p-5">{children}</div>
    </section>
  )
}
