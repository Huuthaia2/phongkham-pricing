import React, { useState, useEffect, useCallback } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import { Loader2, Coins, AlertTriangle } from 'lucide-react'

const fmt = n => ((n||0)/1e6).toFixed(1) + ' tr.đ'
const STATUS = {
  'Chờ duyệt':'bg-amber-100 text-amber-700',
  'Đã duyệt': 'bg-blue-100 text-blue-700',
  'Đã chốt':  'bg-green-100 text-green-700',
  'Huỷ':      'bg-slate-100 text-slate-500',
}

function DepositForm({ maBaoGia, onDone, user }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  async function go() {
    if (!amount) return
    setLoading(true)
    try {
      await API.deposit({ maBaoGia, amount: Number(String(amount).replace(/\D/g,'')), confirmedBy: user?.HoTen })
      onDone()
    } catch(e) { alert('Lỗi: ' + e.message) }
    finally { setLoading(false) }
  }
  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
      <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        placeholder="Số tiền cọc (VND)" value={amount} onChange={e=>setAmount(e.target.value)} />
      <button onClick={go} disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
        <span>Ghi cọc</span>
      </button>
    </div>
  )
}

export default function QuoteListPage() {
  const { user } = useStore()
  const [quotes, setQuotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [error, setError]     = useState('')
  const [displayCount, setDisplayCount] = useState(20)

  useEffect(() => {
    setDisplayCount(20)
  }, [filter, quotes])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (user?.Role === 'Tư vấn viên') params.staffId = user.MaNhanVien
      if (user?.Role === 'Quản lý CS')  params.branch  = user.CoSo
      if (user?.Role === 'Thu ngân')    params.status  = 'Đã chốt'
      const d = await API.getQuotes(params)
      setQuotes(d.quotes || [])
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  async function handleApprove(maBaoGia, decision) {
    if (!window.confirm(`${decision==='approve'?'Duyệt':'Từ chối'} báo giá ${maBaoGia}?`)) return
    try {
      await API.approveQuote({ maBaoGia, approver: user?.HoTen, decision, note: '' })
      load()
    } catch(e) { alert('Lỗi: ' + e.message) }
  }

  const filtered = filter ? quotes.filter(q=>q.TrangThaiBaoGia===filter) : quotes
  const displayed = filtered.slice(0, displayCount)
  const canApprove = user?.Role === 'Admin' || user?.Role === 'Quản lý CS'
  const canDeposit = user?.Role === 'Thu ngân' || user?.Role === 'Admin' || user?.Role === 'Quản lý CS'

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-secondary uppercase tracking-wider font-bold text-slate-800">Danh sách báo giá</h1>
        <span className="text-xs text-slate-500 font-secondary uppercase tracking-wider font-bold">{filtered.length} báo giá</span>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {['','Chờ duyệt','Đã duyệt','Đã chốt','Huỷ'].map(s => (
          <button key={s} onClick={()=>setFilter(s)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-secondary font-bold uppercase tracking-wider transition-all flex-shrink-0
              ${filter===s?'bg-indigo-600 text-white shadow':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s||'Tất cả'}{s?` (${quotes.filter(q=>q.TrangThaiBaoGia===s).length})`:''}
          </button>
        ))}
      </div>

      {error   && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <div className="text-sm font-medium">Đang tải danh sách...</div>
        </div>
      )}
      {!loading && !filtered.length && <div className="text-center py-12 text-slate-400 text-sm">Chưa có báo giá nào</div>}

      <div className="space-y-2">
        {displayed.map(q => (
          <div key={q.MaBaoGia} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-bold text-sm text-slate-800">{q.HoTenKhachHang}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS[q.TrangThaiBaoGia]||'bg-slate-100 text-slate-500'}`}>
                    {q.TrangThaiBaoGia}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{q.MaBaoGia} · {q.NgayTuVan} · {q.CoSo}</div>
                <div className="text-xs text-slate-400">TVV: {q.TenTuVanVien} · {q.SoDienThoai}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-secondary font-bold text-indigo-600 text-lg">{fmt(q.GiaToiUu)}</div>
                <div className="text-xs text-green-600 font-secondary font-bold">-{Math.round((q.TiLeGiam||0)*100)}%</div>
              </div>
            </div>

            {q.CanhBao && <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">⚠️ {q.CanhBao}</div>}
            {q.QuaTangTong && <div className="mt-1 text-xs text-green-700">🎁 {q.QuaTangTong}</div>}

            {canApprove && q.TrangThaiBaoGia === 'Chờ duyệt' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={()=>handleApprove(q.MaBaoGia,'approve')}
                  className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-secondary font-bold uppercase tracking-wider hover:bg-green-700 transition-all">✅ Duyệt</button>
                <button onClick={()=>handleApprove(q.MaBaoGia,'reject')}
                  className="flex-1 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-secondary font-bold uppercase tracking-wider hover:bg-red-200 transition-all">❌ Từ chối</button>
              </div>
            )}

            {canDeposit && q.TrangThaiBaoGia === 'Đã duyệt' && q.DaDatCoc !== 'Đã cọc' && (
              <DepositForm maBaoGia={q.MaBaoGia} onDone={load} user={user} />
            )}

            {q.DaDatCoc === 'Đã cọc' && (
              <div className="mt-2 text-xs text-green-700 font-semibold bg-green-50 rounded-lg px-3 py-2">
                💰 Đã đặt cọc: {Number(q.SoTienCoc||0).toLocaleString('vi-VN')}đ
              </div>
            )}
          </div>
        ))}
        {filtered.length > displayCount && (
          <button onClick={() => setDisplayCount(prev => prev + 20)}
            className="w-full py-3 text-xs font-secondary font-bold uppercase tracking-wider text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 text-center mt-2 border border-dashed border-indigo-200">
            Xem thêm ({filtered.length - displayCount} báo giá)
          </button>
        )}
      </div>
    </div>
  )
}
