import React, { useState, useEffect } from 'react'
import { API } from '../api'
import { useStore } from '../store'

export default function AdminPage() {
  const { user } = useStore()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.Role !== 'Admin') return
    API.getServices({ active: 'false' })
      .then(d => setServices(d.services||[]))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  if (user?.Role !== 'Admin') return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">🚫 Chỉ Admin mới có quyền truy cập</div>
  )

  const needVerify = services.filter(s => s.hasWarning || String(s.CanhBao||'').includes('⚠️'))
  const inactive   = services.filter(s => s.TrangThai === 'Ngừng áp dụng')

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-slideUp">
      <h1 className="text-lg font-bold text-slate-800">⚙️ Quản trị hệ thống</h1>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Tổng dịch vụ', value: services.length, color:'bg-indigo-50 text-indigo-700', icon:'📋' },
          { label:'Đang áp dụng', value: services.filter(s=>s.TrangThai==='Đang áp dụng').length, color:'bg-green-50 text-green-700', icon:'✅' },
          { label:'Cần xác minh', value: needVerify.length, color:'bg-amber-50 text-amber-700', icon:'⚠️' },
          { label:'Ngừng áp dụng', value: inactive.length, color:'bg-red-50 text-red-700', icon:'🔴' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl p-4 ${c.color} border`}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-black">{loading ? '...' : c.value}</div>
            <div className="text-xs font-semibold mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {needVerify.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
            <div className="font-bold text-amber-800 text-sm">⚠️ Dịch vụ cần xác minh ({needVerify.length})</div>
            <div className="text-xs text-amber-600 mt-0.5">Cập nhật trực tiếp trong Google Sheets rồi refresh</div>
          </div>
          {needVerify.map(s => (
            <div key={s.MaDichVu} className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0 bg-amber-50/30">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-slate-400">{s.MaDichVu}</div>
                <div className="font-semibold text-sm text-slate-800 truncate">{s.TenDichVu}</div>
                <div className="text-xs text-amber-600">{s.GhiChu || s.CanhBao}</div>
              </div>
              <div className="text-xs text-slate-400 text-right">{s.NhomDichVu}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 space-y-1">
        <div className="font-bold mb-2">💡 Hướng dẫn cập nhật data</div>
        <div>• Sửa giá / CTKM → cập nhật trực tiếp sheet <strong>DM_DichVu</strong></div>
        <div>• Thêm combo → cập nhật sheet <strong>DM_Combo</strong></div>
        <div>• Thêm nhân viên → cập nhật sheet <strong>DM_NhanVien</strong></div>
        <div>• Sau khi sửa → refresh app để thấy thay đổi</div>
      </div>
    </div>
  )
}
