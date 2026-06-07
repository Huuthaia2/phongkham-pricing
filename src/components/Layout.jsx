import React from 'react'
import { useStore } from '../store'
import logoNgang from '../assets/logo-ngang-1.png'
import { LayoutDashboard, FilePlus, ClipboardList, Settings, LogOut } from 'lucide-react'

const NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan',   roles: ['Admin','Quản lý CS'] },
  { id: 'new-quote', icon: FilePlus,        label: 'Báo giá mới', roles: ['Admin','Quản lý CS','Tư vấn viên'] },
  { id: 'quotes',    icon: ClipboardList,   label: 'Danh sách',   roles: ['Admin','Quản lý CS','Tư vấn viên','Thu ngân'] },
  { id: 'admin',     icon: Settings,        label: 'Quản trị',   roles: ['Admin'] },
]

export default function Layout({ children }) {
  const { user, activeTab, setActiveTab, bumpQuotesVersion, logout } = useStore()

  function handleNavClick(id) {
    if (id === 'quotes') bumpQuotesVersion()
    setActiveTab(id)
  }
  const visible = NAV.filter(n => n.roles.includes(user?.Role || ''))
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <header className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-indigo-600 text-white px-4 py-2 shadow-lg no-print sticky top-0 z-40 border-b-2 border-brand-orange">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 flex items-center justify-center">
              <img src={logoNgang} alt="Logo" className="h-full object-contain" />
            </div>
            <div className="hidden sm:block border-l border-white/20 h-6"></div>
            <div className="text-indigo-200 text-xs font-secondary tracking-wide truncate">{user?.CoSo} · {user?.HoTen}</div>
          </div>
          <button onClick={logout} className="text-xs text-indigo-200 hover:text-brand-orange-light font-secondary tracking-wider uppercase transition-colors flex-shrink-0 flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>
      <div className="hidden sm:flex print:block">
        <nav className="fixed left-0 top-14 bottom-0 w-16 bg-indigo-900 flex flex-col items-center pt-4 gap-1 z-30 no-print">
          {visible.map(n => {
            const Icon = n.icon
            const active = activeTab === n.id
            return (
              <button key={n.id} onClick={() => handleNavClick(n.id)} title={n.label}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all
                  ${active ? 'bg-white text-indigo-600 shadow-lg' : 'text-indigo-300 hover:bg-indigo-700'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-secondary font-bold uppercase tracking-wider">{n.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </nav>
        <main className="flex-1 ml-16 pb-6 print:ml-0">
          <div className="max-w-screen-lg mx-auto px-4 pt-4">{children}</div>
        </main>
      </div>
      <main className="sm:hidden print:hidden pb-20 px-3 pt-3">{children}</main>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40 no-print shadow-lg">
        {visible.map(n => {
          const Icon = n.icon
          const active = activeTab === n.id
          return (
            <button key={n.id} onClick={() => handleNavClick(n.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-semibold
                ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-secondary uppercase tracking-wider">{n.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
