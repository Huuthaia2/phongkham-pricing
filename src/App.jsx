import React from 'react'
import { useStore } from './store'
import LoginPage      from './pages/LoginPage'
import Layout         from './components/Layout'
import DashboardPage  from './pages/DashboardPage'
import NewQuotePage   from './pages/NewQuotePage'
import QuoteListPage  from './pages/QuoteListPage'
import QuoteDetailPage from './pages/QuoteDetailPage'
import AdminPage      from './pages/AdminPage'

export default function App() {
  const { user, activeTab } = useStore()
  if (!user) return <LoginPage />
  return (
    <Layout>
      {activeTab === 'dashboard' && <DashboardPage />}
      {activeTab === 'new-quote' && <NewQuotePage />}
      {/* Giữ quotes & detail luôn mounted — tránh reload khi back */}
      <div className={`no-print ${activeTab !== 'quotes' ? 'hidden' : ''}`}><QuoteListPage /></div>
      <div className={activeTab !== 'detail' ? 'hidden' : ''}><QuoteDetailPage /></div>
      {activeTab === 'admin'     && <AdminPage />}
    </Layout>
  )
}

