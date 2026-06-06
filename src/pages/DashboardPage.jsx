import React, { useState, useEffect } from 'react'
import { API } from '../api'
import { useStore } from '../store'

const fmt  = n => (n||0).toLocaleString('vi-VN') + 'đ'
const fmtM = n => ((n||0)/1e6).toFixed(1) + ' tr.đ'
const fmtP = n => ((n||0)*100).toFixed(1) + '%'

function KpiCard({ icon, label, value, sub, color }) {
  const cols = { indigo:'from-indigo-600 to-indigo-500', blue:'from-blue-600 to-blue-500',
    green:'from-emerald-600 to-emerald-500', amber:'from-amber-500 to-amber-400', red:'from-red-600 to-red-500' }
  return (
    <div className={`rounded-2xl p-4 text-white shadow-lg bg-gradient-to-br ${cols[color]||cols.indigo}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-black leading-tight">{value}</div>
      <div className="text-xs opacity-80 mt-1 font-medium">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { user, setActiveTab } = useStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const branch = user?.Role === 'Admin' ? '' : user?.CoSo
    API.getDashboard(branch)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-400"><div className="text-center"><div className="text-4xl mb-2 animate-spin">⚙️</div><div className="text-sm">Đang tải...</div></div></div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">⚠️ {error}</div>

  const k = data?.kpis || {}
  const w = data?.warnings || {}

  return (
    <div className="space-y-4 animate-slideUp">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Tổng quan tháng này</h1>
        <button onClick={()=>setActiveTab('new-quote')}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl font-semibold shadow hover:bg-indigo-700 transition-all active:scale-95">
          ➕ Báo giá mới
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon="📄" label="Tổng báo giá"     value={k.totalQuotes||0}          color="indigo" />
        <KpiCard icon="💰" label="Giá niêm yết"     value={fmtM(k.totalNY)}           color="blue"   sub="triệu đồng" />
        <KpiCard icon="✅" label="Sau ưu đãi"       value={fmtM(k.totalToiUu)}        color="green"  sub="triệu đồng" />
        <KpiCard icon="📉" label="Tỷ lệ giảm TB"   value={fmtP(k.avgDiscount)}       color="amber" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon="🎯" label="Đã chốt"          value={k.chotCount||0}            color="green" />
        <KpiCard icon="⏳" label="Chờ duyệt"        value={k.waitCount||0}            color="amber" />
        <KpiCard icon="📈" label="Tỷ lệ chốt"      value={fmtP(k.conversionRate)}    color="blue" />
        <KpiCard icon="🎁" label="Khách tiết kiệm" value={fmtM(k.totalGiam)}         color="indigo" sub="triệu đồng" />
      </div>

      {(w.missingPrice>0 || w.needVerify>0 || w.pendingApproval>0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="font-bold text-amber-800 text-sm">⚠️ Cần xử lý</div>
          {w.missingPrice>0    && <div className="text-sm text-amber-700">• {w.missingPrice} dịch vụ chưa có giá – không tính được</div>}
          {w.needVerify>0      && <div className="text-sm text-amber-700">• {w.needVerify} dịch vụ đang chờ xác minh KM</div>}
          {w.pendingApproval>0 && <button onClick={()=>setActiveTab('quotes')} className="text-sm text-red-700 font-semibold hover:underline block">• {w.pendingApproval} báo giá đang chờ duyệt →</button>}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-700 text-sm">Báo giá gần nhất</div>
          <button onClick={()=>setActiveTab('quotes')} className="text-indigo-600 text-xs font-semibold hover:underline">Xem tất cả →</button>
        </div>
        {!(data?.recentQuotes?.length) && <div className="px-4 py-6 text-center text-slate-400 text-sm">Chưa có báo giá nào</div>}
        {(data?.recentQuotes||[]).slice(0,6).map(q => (
          <div key={q.MaBaoGia} className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-800 truncate">{q.HoTenKhachHang}</div>
              <div className="text-xs text-slate-400">{q.MaBaoGia} · {q.NgayTuVan} · {q.TenTuVanVien}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-sm text-indigo-700">{fmtM(q.GiaToiUu)}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                ${q.TrangThaiBaoGia==='Đã chốt'?'bg-green-100 text-green-700':
                  q.TrangThaiBaoGia==='Chờ duyệt'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'}`}>
                {q.TrangThaiBaoGia}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
