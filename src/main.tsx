import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { firebaseInitError } from './firebase'
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'

// GitHub Pages はサーバー側でのリライトができないため、直リンク（/s/:id）でも
// 404にならないよう HashRouter（URLの # 以降だけで経路を管理する方式）を使う。
const root = ReactDOM.createRoot(document.getElementById('root')!)

if (firebaseInitError) {
  root.render(
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#b91c1c' }}>
      {firebaseInitError}
    </div>,
  )
} else {
  root.render(
    <React.StrictMode>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/s/:scheduleId" element={<SchedulePage />} />
        </Routes>
      </HashRouter>
    </React.StrictMode>,
  )
}
