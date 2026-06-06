import React from 'react'
import { useStore } from '../store'
export default function QuoteDetailPage() {
  const { setActiveTab } = useStore()
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">📋</div>
      <div className="text-slate-600 mb-4">Chọn báo giá từ danh sách để xem chi tiết</div>
      <button onClick={()=>setActiveTab('quotes')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">← Về danh sách</button>
    </div>
  )
}
