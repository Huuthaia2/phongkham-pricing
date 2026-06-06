import React from 'react'
import { useStore } from '../store'

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Tổng quan',   roles: ['Admin','Quản lý CS'] },
  { id: 'new-quote', icon: '➕', label: 'Báo giá mới', roles: ['Admin','Quản lý CS','Tư vấn viên'] },
  { id: 'quotes',    icon: '📋', label: 'Danh sách',   roles: ['Admin','Quản lý CS','Tư vấn viên','Thu ngân'] },
  { id: 'admin',     icon: '⚙️',  label: 'Quản trị',   roles: ['Admin'] },
]

export default function Layout({ children }) {
  const { user, activeTab, setActiveTab, logout } = useStore()
  const visible = NAV.filter(n => n.roles.includes(user?.Role || ''))
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-4 py-3 shadow-lg no-print sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">💎</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">Hệ Thống Tính Giá Dịch Vụ</div>
            <div className="text-indigo-200 text-xs truncate">{user?.CoSo} · {user?.HoTen}</div>
          </div>
          <button onClick={logout} className="text-xs text-indigo-200 hover:text-white">Đăng xuất</button>
        </div>
      </header>
      <div className="hidden sm:flex">
        <nav className="fixed left-0 top-14 bottom-0 w-16 bg-indigo-900 flex flex-col items-center pt-4 gap-1 z-30 no-print">
          {visible.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} title={n.label}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all
                ${activeTab===n.id ? 'bg-white text-indigo-700 shadow-lg' : 'text-indigo-300 hover:bg-indigo-700'}`}>
              <span className="text-lg leading-none">{n.icon}</span>
              <span className="text-[9px] font-semibold">{n.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
        <main className="flex-1 ml-16 pb-6">
          <div className="max-w-screen-lg mx-auto px-4 pt-4">{children}</div>
        </main>
      </div>
      <main className="sm:hidden pb-20 px-3 pt-3">{children}</main>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40 no-print shadow-lg">
        {visible.map(n => (
          <button key={n.id} onClick={() => setActiveTab(n.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-semibold
              ${activeTab===n.id ? 'text-indigo-600' : 'text-slate-400'}`}>
            <span className="text-xl leading-none">{n.icon}</span>
            <span className="text-[10px]">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
