import React, { useState, useEffect } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Settings, 
  Lightbulb 
} from 'lucide-react'

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
    <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
      <ShieldAlert className="w-8 h-8 text-slate-350" />
      <span>Chỉ Admin mới có quyền truy cập</span>
    </div>
  )

  const needVerify = services.filter(s => s.hasWarning || String(s.CanhBao||'').includes('⚠️'))
  const inactive   = services.filter(s => s.TrangThai === 'Ngừng áp dụng')

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-slideUp">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-slate-700" />
        <h1 className="text-xl font-secondary tracking-wider uppercase font-bold text-slate-800">Quản trị hệ thống</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Tổng dịch vụ', value: services.length, color:'bg-indigo-50 border-indigo-200 text-indigo-700', icon: ClipboardList },
          { label:'Đang áp dụng', value: services.filter(s=>s.TrangThai==='Đang áp dụng').length, color:'bg-green-50 border-green-200 text-green-700', icon: CheckCircle2 },
          { label:'Cần xác minh', value: needVerify.length, color:'bg-amber-50 border-amber-200 text-amber-700', icon: AlertTriangle },
          { label:'Ngừng áp dụng', value: inactive.length, color:'bg-red-50 border-red-200 text-red-700', icon: XCircle },
        ].map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className={`rounded-2xl p-4 ${c.color} border flex items-center justify-between`}>
              <div>
                <div className="text-2xl font-black">{loading ? '...' : c.value}</div>
                <div className="text-xs font-semibold mt-0.5">{c.label}</div>
              </div>
              <Icon className="w-8 h-8 opacity-75" />
            </div>
          )
        })}
      </div>

      {needVerify.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-amber-800 text-sm">Dịch vụ cần xác minh ({needVerify.length})</div>
              <div className="text-xs text-amber-600 mt-0.5">Cập nhật trực tiếp trong Google Sheets rồi refresh</div>
            </div>
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
        <div className="font-bold mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-blue-600" />
          <span>Hướng dẫn cập nhật data</span>
        </div>
        <div>• Sửa giá / CTKM → cập nhật trực tiếp sheet <strong>DM_DichVu</strong></div>
        <div>• Thêm combo → cập nhật sheet <strong>DM_Combo</strong></div>
        <div>• Thêm nhân viên → cập nhật sheet <strong>DM_NhanVien</strong></div>
        <div>• Sau khi sửa → refresh app để thấy thay đổi</div>
      </div>
    </div>
  )
}
