import { Link } from 'react-router-dom'

export default function AppHeader() {
  return (
    <header className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 shadow-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-xl">
            ⚔️
          </span>
          <span className="text-lg font-bold tracking-wide text-white">ボススケジューラー</span>
        </Link>
      </div>
    </header>
  )
}
