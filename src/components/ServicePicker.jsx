import React, { useState, useEffect, useMemo } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import { Loader2, AlertTriangle, Gift, AlertCircle } from 'lucide-react'

export default function ServicePicker() {
  const { cart, addToCart, removeFromCart, updateQty } = useStore()
  const [services, setServices] = useState([])
  const [groups, setGroups]     = useState([])
  const [group, setGroup]       = useState('Tất cả')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [displayCount, setDisplayCount] = useState(25)

  useEffect(() => {
    API.getServices()
      .then(d => { setServices(d.services||[]); setGroups(d.groups||[]) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setDisplayCount(25)
  }, [group, search])

  const filtered = useMemo(() => services.filter(s => {
    const g = group === 'Tất cả' || s.NhomDichVu === group
    const q = !search || s.TenDichVu?.toLowerCase().includes(search.toLowerCase()) || s.MaDichVu?.toLowerCase().includes(search.toLowerCase())
    return g && q
  }), [services, group, search])

  const displayed = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount])

  const cartTotal = cart.reduce((s,i) => s + (Number(i._svc?.GiaSauKM)||0) * i.quantity, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      <span className="text-sm font-medium">Đang tải danh sách dịch vụ...</span>
    </div>
  )
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-2">
        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Tìm tên dịch vụ hoặc mã DV..."
          value={search} onChange={e=>setSearch(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['Tất cả', ...groups].map(g => (
            <button key={g} onClick={()=>setGroup(g)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-secondary font-bold uppercase tracking-wider transition-all flex-shrink-0
                ${group===g ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-indigo-800 text-sm font-secondary font-bold tracking-wider uppercase">
          ✓ Đã chọn {cart.length} dịch vụ · Tổng TQ: <span className="text-indigo-650">{cartTotal.toLocaleString('vi-VN')}đ</span>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Không tìm thấy dịch vụ phù hợp</div>}
        {displayed.map(svc => {
          const inCart = cart.find(i => i.serviceId === svc.MaDichVu)
          const qty = inCart?.quantity || 1
          return (
            <div key={svc.MaDichVu}
              className={`bg-white rounded-2xl border shadow-sm transition-all ${inCart ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-100 hover:border-slate-300'}`}>
              <div className="p-3.5 flex items-start gap-3 cursor-pointer select-none active:bg-slate-50 transition-colors"
                onClick={() => inCart ? removeFromCart(svc.MaDichVu) : addToCart(svc)}>
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${inCart ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                  {inCart && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-400 font-mono">{svc.MaDichVu}</div>
                  <div className="font-semibold text-sm text-slate-800 leading-snug">{svc.TenDichVu}</div>
                  {svc.GhiChu && (
                    <div className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>{svc.GhiChu}</span>
                    </div>
                  )}
                  {svc.QuaTang && (
                    <div className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span>{svc.QuaTang}</span>
                    </div>
                  )}
                  {svc.hasWarning && (
                    <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span>Cần xác minh giá trước khi chào</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {svc.GiaNiemYet && <span className="text-xs text-slate-400 line-through">{Number(svc.GiaNiemYet).toLocaleString('vi-VN')}đ</span>}
                    <span className="font-secondary font-bold text-indigo-600 text-base">
                      {svc.GiaSauKM ? Number(svc.GiaSauKM).toLocaleString('vi-VN')+'đ' : '—'}
                    </span>
                    {svc.PhanTramKM > 0 && <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-semibold font-secondary font-bold">-{Math.round(svc.PhanTramKM*100)}%</span>}
                    {svc.DonViTinh && svc.DonViTinh !== 'Dịch vụ' && <span className="text-xs text-slate-400">/{svc.DonViTinh}</span>}
                  </div>
                </div>
              </div>
              {inCart && (
                <div className="px-3.5 pb-3 flex items-center gap-3 border-t border-slate-100 pt-2.5" onClick={e=>e.stopPropagation()}>
                  <span className="text-xs text-slate-500">Số lượng:</span>
                  <button className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                    onClick={()=>updateQty(svc.MaDichVu, qty-1)}>−</button>
                  <span className="font-bold w-5 text-center text-slate-800">{qty}</span>
                  <button className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200"
                    onClick={()=>updateQty(svc.MaDichVu, qty+1)}>+</button>
                  <span className="ml-auto font-secondary font-bold text-indigo-600 text-base">
                    {(Number(svc.GiaSauKM||0)*qty).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length > displayCount && (
          <button onClick={() => setDisplayCount(prev => prev + 25)}
            className="w-full py-3 text-xs font-secondary font-bold uppercase tracking-wider text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 text-center mt-2 border border-dashed border-indigo-200">
            Xem thêm ({filtered.length - displayCount} dịch vụ)
          </button>
        )}
      </div>
    </div>
  )
}
