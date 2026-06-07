import React from 'react'
import { useStore } from '../store'
import { ClipboardList } from 'lucide-react'

export default function QuoteDetailPage() {
  const { setActiveTab } = useStore()
  return (
    <div className="text-center py-12 flex flex-col items-center justify-center">
      <ClipboardList className="w-12 h-12 text-slate-350 mb-3" />
      <div className="text-slate-600 mb-4 text-sm font-medium">Chọn báo giá từ danh sách để xem chi tiết</div>
      <button onClick={()=>setActiveTab('quotes')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-secondary font-bold uppercase tracking-wider text-xs hover:bg-indigo-700 transition-all">← Về danh sách</button>
    </div>
  )
}
