import React, { useEffect, useState } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import logoNgang from '../assets/logo-ngang.png'
import {
  ArrowLeft, Printer, Loader2, AlertTriangle,
  Coins, Gift, Zap, Check, X, ChevronRight, Trash2
} from 'lucide-react'

const fmt  = n => (n||0).toLocaleString('vi-VN') + 'đ'
const fmtM = n => ((n||0)/1e6).toFixed(1) + ' tr.đ'

const STATUS = {
  'Chờ duyệt': 'bg-amber-100 text-amber-700 border-amber-200',
  'Đã duyệt':  'bg-blue-100 text-blue-700 border-blue-200',
  'Đã chốt':   'bg-green-100 text-green-700 border-green-200',
  'Từ chối':   'bg-red-100 text-red-700 border-red-200',
  'Huỷ':       'bg-slate-100 text-slate-500 border-slate-200',
}

// ─── Layout In ──────────────────────────────────────────────
function PrintLayout({ quote, details, wrapClass = 'hidden print:!block' }) {
  const branchName = String(quote.CoSo||'').includes('OCP') ? 'OceanPark (OCP)' :
                     String(quote.CoSo||'').includes('HQV') ? 'Hoàng Quốc Việt (HQV)' :
                     quote.CoSo || '---'
  const tiLeGiam = Number(quote.TiLeGiam || 0)

  return (
    <div className={`${wrapClass} text-[13px] text-slate-800 font-sans`}>

      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b-2 border-indigo-700 mb-4">
        <img src={logoNgang} alt="Logo" className="h-14 object-contain" />
        <div className="text-right">
          <div className="text-base font-bold uppercase tracking-widest text-indigo-800 leading-snug">Công ty Cổ phần Tập đoàn Y tế Hoàng Tuấn</div>
          <div className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
            Địa chỉ: Số 24 (40-BT8) 25 (38-BT8), KĐT mới Văn Quán - Yên Phúc,<br/>
            P. Văn Quán, Q. Hà Đông, TP. Hà Nội<br/>
            Hotline: 0961 888 656 &nbsp;|&nbsp; Website: thammyhoangtuan.vn
          </div>
        </div>
      </div>

      {/* Thông tin KH */}
      <div className="mb-3 rounded border border-indigo-200 overflow-hidden">
        <div className="bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5">Thông tin khách hàng</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3 text-[12.5px]">
          <div className="flex gap-1"><span className="text-slate-500 min-w-[100px]">Mã báo giá:</span><span className="font-bold text-indigo-700">{quote.MaBaoGia}</span></div>
          <div className="flex gap-1"><span className="text-slate-500 min-w-[100px]">Ngày tư vấn:</span><span className="font-semibold">{quote.NgayTuVan}</span></div>
          <div className="flex gap-1"><span className="text-slate-500 min-w-[100px]">Khách hàng:</span><span className="font-bold">{quote.HoTenKhachHang}</span></div>
          <div className="flex gap-1"><span className="text-slate-500 min-w-[100px]">Cơ sở:</span><span className="font-semibold">{branchName}</span></div>
          <div className="flex gap-1"><span className="text-slate-500 min-w-[100px]">Số điện thoại:</span><span className="font-semibold">{quote.SoDienThoai || '---'}</span></div>
          <div className="flex gap-1"><span className="text-slate-500 min-w-[100px]">Tư vấn viên:</span><span className="font-semibold">{quote.TenTuVanVien || '---'}</span></div>
          <div className="flex gap-1 col-span-2"><span className="text-slate-500 min-w-[100px]">Hiệu lực báo giá:</span><span className="font-semibold">{quote.NgayHetHanBaoGia || '7 ngày kể từ ngày tư vấn'}</span></div>
        </div>
      </div>

      {/* Chi tiết dịch vụ */}
      <div className="mb-3 rounded border border-indigo-200 overflow-hidden">
        <div className="bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5">Chi tiết dịch vụ</div>
        <div className="divide-y divide-slate-100">
          {(details||[]).map((line, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 text-[12.5px]">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-slate-400 font-mono text-xs w-5 text-center">{i+1}</span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{line.TenDichVu || line.serviceName}</div>
                  {line.ComboApDung && <div className="text-xs text-amber-600">Combo: {line.ComboApDung}</div>}
                  {line.QuaTang    && <div className="text-xs text-green-600">🎁 {line.QuaTang}</div>}
                </div>
                {Number(line.SoLuong||line.quantity||1) > 1 && (
                  <span className="text-xs text-slate-400 mr-3">×{line.SoLuong||line.quantity}</span>
                )}
              </div>
              <div className="text-right ml-4 shrink-0">
                <div className="text-xs text-slate-400 line-through">{fmt(line.ThanhTienNY||line.lineNY||0)}</div>
                <div className="font-bold text-indigo-700">{fmt(line.ThanhTienTQ||line.lineTQ||0)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tổng kết */}
      <div className="mb-3 rounded border border-indigo-200 overflow-hidden">
        <div className="bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5">Tổng kết</div>
        <div className="px-4 py-3 space-y-1.5 text-[12.5px]">
          <div className="flex justify-between"><span className="text-slate-500">Tổng giá niêm yết:</span><span>{fmt(quote.TongGiaNiemYet)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Tổng giá sau CTKM thường quy:</span><span>{fmt(quote.TongGiaSauTQ)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Chương trình KM tốt nhất áp dụng:</span><span className="font-semibold text-right max-w-[50%]">{quote.QuyenToiUu}</span></div>
          <div className="flex justify-between border-t border-indigo-200 pt-2 mt-1">
            <span className="font-bold text-indigo-800 text-base">💰 GIÁ SAU ƯU ĐÃI TỐT NHẤT:</span>
            <span className="font-bold text-indigo-800 text-base">{fmt(quote.GiaToiUu)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500"><span>Tổng tiền được giảm:</span><span className="text-green-600 font-semibold">{fmt(quote.TienGiam)}</span></div>
          <div className="flex justify-between text-xs text-slate-500"><span>Tỷ lệ giảm thực tế:</span><span className="text-green-600 font-semibold">{(tiLeGiam*100).toFixed(1)}%</span></div>
          {quote.QuaTangTong && (
            <div className="flex justify-between text-xs text-slate-500"><span>Quà tặng đi kèm:</span><span className="text-green-600 font-semibold">{quote.QuaTangTong}</span></div>
          )}
        </div>
      </div>

      {/* Điều kiện & Chữ ký — không tách trang */}
      <div className="break-inside-avoid">
        <div className="mb-3 rounded border border-slate-200 px-4 py-2.5 text-[11px] text-slate-500 space-y-0.5">
          <div className="font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-1">Điều kiện áp dụng &amp; Ghi chú</div>
          <div>• Báo giá có hiệu lực 7 ngày kể từ ngày tư vấn. Sau thời hạn này, vui lòng liên hệ lại để cập nhật giá.</div>
          <div>• Giá trên đã bao gồm CTKM thường quy TQ-01 đang áp dụng tại hệ thống.</div>
          <div>• KM Sinh nhật chỉ áp dụng tại CS OceanPark và không cộng dồn với Combo Siêu Hời.</div>
          <div>• Để chốt dịch vụ, khách hàng cần đặt cọc theo quy định của phòng khám.</div>
          <div>• Mọi thắc mắc vui lòng liên hệ tư vấn viên phụ trách.</div>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8 text-center text-[12px]">
          <div>
            <div className="font-semibold text-slate-700 mb-12">Khách hàng xác nhận</div>
            <div className="border-t border-slate-300 pt-2 text-slate-400 text-xs italic">(Ký và ghi rõ họ tên)</div>
          </div>
          <div>
            <div className="font-semibold text-slate-700 mb-12">Tư vấn viên</div>
            <div className="border-t border-slate-300 pt-2 text-slate-400 text-xs italic">(Ký và ghi rõ họ tên)</div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Trang Chi Tiết ─────────────────────────────────────────
export default function QuoteDetailPage() {
  const { currentQuoteId, setActiveTab, user } = useStore()
  const [quote,        setQuote]        = useState(null)
  const [details,      setDetails]      = useState([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [printPreview, setPrintPreview] = useState(false)

  const handlePrint = () => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    if (isMobile) setPrintPreview(true)
    else window.print()
  }

  useEffect(() => {
    if (!currentQuoteId) return
    setLoading(true); setError('')
    API.getQuote(currentQuoteId)
      .then(d => { setQuote(d.quote); setDetails(d.details || []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [currentQuoteId])

  if (!currentQuoteId) {
    return (
      <div className="text-center py-16 flex flex-col items-center gap-3">
        <ChevronRight className="w-10 h-10 text-slate-300 rotate-180" />
        <div className="text-slate-500 text-sm">Chọn báo giá từ danh sách để xem chi tiết</div>
        <button onClick={() => setActiveTab('quotes')}
          className="mt-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-secondary font-bold uppercase tracking-wider text-xs hover:bg-indigo-700 transition-all">
          ← Về danh sách
        </button>
      </div>
    )
  }

  if (loading) return (
    <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      <div className="text-sm">Đang tải báo giá...</div>
    </div>
  )

  if (error) return (
    <div className="max-w-lg mx-auto mt-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
      <div className="text-red-700 text-sm font-medium">{error}</div>
      <button onClick={() => setActiveTab('quotes')}
        className="mt-4 text-xs text-indigo-600 font-bold underline">← Về danh sách</button>
    </div>
  )

  if (!quote) return null

  const tiLeGiam = Number(quote.TiLeGiam || 0)
  const branchName = String(quote.CoSo||'').includes('OCP') ? 'OceanPark (OCP)' :
                     String(quote.CoSo||'').includes('HQV') ? 'Hoàng Quốc Việt (HQV)' :
                     quote.CoSo || '---'

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-slideUp">

      {/* Layout In (chỉ hiện khi in) */}
      <PrintLayout quote={quote} details={details} />

      {/* ─── UI Màn hình (ẩn khi in) ─── */}
      <div className="print:!hidden space-y-4">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setActiveTab('quotes')}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 font-secondary font-bold transition-all">
            <ArrowLeft className="w-4 h-4" />
            Danh sách
          </button>
          <div className="flex items-center gap-2">
            {user?.Role === 'Admin' && (
              <button onClick={async () => {
                if (!window.confirm(`Xóa báo giá ${quote.MaBaoGia}? Không thể hoàn tác.`)) return
                try {
                  await API.deleteQuote({ maBaoGia: quote.MaBaoGia })
                  setActiveTab('quotes')
                } catch(e) { alert('Lỗi: ' + e.message) }
              }}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-secondary font-bold uppercase tracking-wider transition-all">
                <Trash2 className="w-3.5 h-3.5" />
                Xóa
              </button>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-secondary font-bold uppercase tracking-wider transition-all shadow">
              <Printer className="w-4 h-4" />
              In báo giá
            </button>
          </div>
        </div>

        {/* Header KH */}
        <div className="bg-gradient-to-r from-indigo-800 to-indigo-600 rounded-2xl overflow-hidden text-white shadow-lg">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-secondary uppercase tracking-wider font-bold text-xl leading-none">{quote.HoTenKhachHang}</div>
                <div className="text-indigo-200 text-xs mt-1.5">{quote.SoDienThoai} · {branchName} · {quote.NgayTuVan}</div>
                <div className="text-indigo-200 text-[11px] mt-0.5">TVV: {quote.TenTuVanVien} · Mã: {quote.MaBaoGia}</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border flex-shrink-0 ${STATUS[quote.TrangThaiBaoGia]||'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {quote.TrangThaiBaoGia}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-white/10 bg-indigo-950/20">
            {[
              ['Giá niêm yết', fmtM(quote.TongGiaNiemYet)],
              ['Sau TQ-01',    fmtM(quote.TongGiaSauTQ)],
              ['Tiết kiệm',   fmtM(quote.TienGiam)],
            ].map(([l,v]) => (
              <div key={l} className="px-3 py-3 text-center border-r border-white/10 last:border-0">
                <div className="text-xs text-indigo-200 font-secondary uppercase tracking-wider font-semibold">{l}</div>
                <div className="font-secondary font-bold text-base mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Giá tối ưu */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-xl shadow-green-200">
          <div className="text-sm font-secondary font-bold uppercase tracking-wider text-green-100 mb-1">💰 Giá sau ưu đãi tốt nhất</div>
          <div className="text-4xl font-secondary font-bold tracking-wide">{fmt(quote.GiaToiUu)}</div>
          <div className="text-green-100 text-sm mt-1">{quote.QuyenToiUu}</div>
          <div className="mt-2 text-xs text-green-200">Giảm {(tiLeGiam*100).toFixed(1)}% — Tiết kiệm {fmt(quote.TienGiam)}</div>
          {quote.QuaTangTong && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
              <span>{quote.QuaTangTong}</span>
            </div>
          )}
        </div>

        {/* Cọc */}
        {quote.DaDatCoc === 'Đã cọc' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-green-700 text-sm font-semibold">
            <Coins className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Đã đặt cọc: {Number(quote.SoTienCoc||0).toLocaleString('vi-VN')}đ</span>
          </div>
        )}

        {/* Duyệt / người duyệt */}
        {quote.NguoiDuyetBaoGia && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-0.5">
            <div><span className="font-semibold text-slate-600">Người duyệt:</span> {quote.NguoiDuyetBaoGia}</div>
            {quote.GhiChuDuyet && <div><span className="font-semibold text-slate-600">Ghi chú duyệt:</span> {quote.GhiChuDuyet}</div>}
            <div><span className="font-semibold text-slate-600">Hiệu lực đến:</span> {quote.NgayHetHanBaoGia}</div>
          </div>
        )}

        {/* Chi tiết dịch vụ */}
        {details.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 font-secondary uppercase tracking-wider font-bold text-slate-700 text-sm">
              Chi tiết dịch vụ ({details.length})
            </div>
            {details.map((line, i) => (
              <div key={i} className={`px-4 py-3 flex items-start gap-3 border-b border-slate-50 last:border-0 ${i%2?'bg-slate-50/40':''}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 leading-snug">{line.TenDichVu || line.serviceName}</div>
                  {Number(line.SoLuong||1) > 1 && <div className="text-xs text-slate-400">×{line.SoLuong}</div>}
                  {line.ComboApDung && (
                    <div className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />{line.ComboApDung}
                    </div>
                  )}
                  {line.QuaTang && (
                    <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <Gift className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />{line.QuaTang}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-400 line-through">{fmt(line.ThanhTienNY||line.lineNY||0)}</div>
                  <div className="font-secondary font-bold text-indigo-600 text-base">{fmt(line.ThanhTienTQ||line.lineTQ||0)}</div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3.5 flex justify-between font-bold text-slate-800 bg-slate-50 border-t border-slate-200 items-center">
              <span className="font-secondary uppercase tracking-wider text-sm">Tổng (phương án tối ưu)</span>
              <span className="text-indigo-600 font-secondary font-bold text-2xl">{fmt(quote.GiaToiUu)}</span>
            </div>
          </div>
        )}

        {/* Ghi chú tư vấn */}
        {quote.GhiChuTuVan && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <span className="font-bold">Ghi chú tư vấn:</span> {quote.GhiChuTuVan}
          </div>
        )}

        {/* Điều kiện */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-500 font-medium">
          <div>• Báo giá có hiệu lực 7 ngày kể từ ngày tư vấn.</div>
          <div>• KM Sinh nhật chỉ áp dụng tại CS OceanPark, không cộng với Combo Siêu Hời.</div>
          <div>• Giá đã bao gồm CTKM thường quy TQ-01 hiện hành.</div>
        </div>

      </div>{/* end print:hidden */}

      {/* ─── Mobile Print Preview Overlay ─── */}
      {printPreview && (
        <div className="no-print fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <button onClick={() => setPrintPreview(false)}
              className="flex items-center gap-1.5 text-sm text-slate-600 font-secondary font-bold">
              <X className="w-4 h-4" /> Đóng
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-secondary font-bold uppercase tracking-wider shadow">
              <Printer className="w-4 h-4" /> In / Lưu PDF
            </button>
          </div>
          <div className="p-4 max-w-2xl mx-auto">
            <PrintLayout quote={quote} details={details} wrapClass="" />
          </div>
        </div>
      )}

    </div>
  )
}
