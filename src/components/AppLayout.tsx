import { Outlet } from 'react-router-dom'
import AppHeader from './AppHeader'

export default function AppLayout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="pointer-events-none fixed -top-24 -left-24 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-24 h-96 w-96 rounded-full bg-purple-300/30 blur-3xl" />

      <div className="relative">
        <AppHeader />
        <Outlet />
      </div>
    </div>
  )
}
