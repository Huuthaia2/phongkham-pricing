import React from 'react'
import { useStore } from '../store'
import logoNgang from '../assets/logo-ngang.png'
import { AlertTriangle, Star, Check, Gift, Zap, Printer, Save, Loader2 } from 'lucide-react'

const fmt  = n => (n||0).toLocaleString('vi-VN') + 'đ'
const fmtM = n => ((n||0)/1e6).toFixed(1) + ' tr.đ'

export default function PriceResult({ result, onBack, onSave, loading }) {
  const { customer, user } = useStore()
  const { totalNY, totalTQ, bestPlan, allPlans, tienGiam, tiLeGiam,
          needsApproval, gifts, warnings, comboSuggestions, detailLines } = result

  return (
    <div className="space-y-4 animate-slideUp">
      {/* Print-only brand header */}
      <div className="hidden print:flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
        <img src={logoNgang} alt="Logo" className="h-12 object-contain" />
        <div className="text-right">
          <div className="font-logo text-base tracking-wider uppercase text-slate-800">Báo Giá Dịch Vụ</div>
          <div className="text-xs font-secondary tracking-wide text-slate-500 uppercase mt-1">{customer.branch} · Ngày tư vấn: {customer.consultDate}</div>
        </div>
      </div>

      {/* KH header */}
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-600 rounded-2xl overflow-hidden text-white shadow-lg">
        <div className="px-5 py-4 flex items-start justify-between gap-2">
          <div>
            <div className="font-secondary uppercase tracking-wider font-bold text-xl leading-none">{customer.name}</div>
            <div className="text-indigo-200 font-secondary tracking-wide text-xs mt-1.5">{customer.phone} · {customer.branch} · {customer.consultDate}</div>
            <div className="text-indigo-200 font-secondary tracking-wide text-[11px] mt-0.5">TVV: {user?.HoTen}</div>
          </div>
          <button onClick={onBack} className="text-xs bg-white/20 hover:bg-white/30 font-secondary uppercase tracking-wider px-3 py-1.5 rounded-lg no-print transition-all">← Sửa</button>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 bg-indigo-950/20">
          {[['Giá niêm yết', fmt(totalNY)], ['Sau TQ-01', fmt(totalTQ)], ['Tiết kiệm', fmt(tienGiam)]].map(([l,v]) => (
            <div key={l} className="px-3 py-3 text-center border-r border-white/10 last:border-0">
              <div className="text-xs text-indigo-200 font-secondary uppercase tracking-wider font-semibold">{l}</div>
              <div className="font-secondary font-bold text-base mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs approval */}
      {needsApproval && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex gap-2.5 items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-700">Cần Quản lý CS duyệt</div>
            <div className="text-sm text-red-600 mt-1">Tỷ lệ giảm {(tiLeGiam*100).toFixed(1)}% vượt ngưỡng 50%. Báo giá sẽ ở trạng thái "Chờ duyệt".</div>
          </div>
        </div>
      )}

      {/* Best plan */}
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-xl shadow-green-200">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-yellow-300 fill-yellow-300 flex-shrink-0 animate-pulse" />
          <span className="font-secondary uppercase tracking-wider font-bold text-sm">Phương án tối ưu nhất</span>
          <span className="ml-auto bg-white/30 px-2.5 py-0.5 rounded-full text-xs font-secondary font-bold tracking-wider">
            -{Math.round(tiLeGiam*100)}%
          </span>
        </div>
        <div className="text-4xl font-secondary font-bold tracking-wide mb-1">{fmt(bestPlan?.total)}</div>
        <div className="text-green-100 text-sm mb-3">{bestPlan?.label}</div>
        <div className="space-y-1.5">
          {(bestPlan?.promos||[]).map((p,i) => (
            <div key={i} className="text-xs text-green-100 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>
        {(gifts||[]).length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20 text-xs flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
            <span>{gifts.join(' · ')}</span>
          </div>
        )}
        {(bestPlan?.warnings||[]).map((w,i) => (
          <div key={i} className="mt-1.5 text-xs text-yellow-250 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-250 flex-shrink-0" />
            <span>{w}</span>
          </div>
        ))}
      </div>

      {/* All plans */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-secondary uppercase tracking-wider font-bold text-slate-700 text-sm">So sánh phương án</div>
        {(allPlans||[]).map((plan,i) => (
          <div key={i} className={`px-4 py-3.5 flex items-center gap-3 border-b border-slate-50 last:border-0 ${plan.id===bestPlan?.id?'bg-green-50':''}`}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-800">{plan.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">Tiết kiệm: {fmt(totalNY - plan.total)}</div>
              {(plan.warnings||[]).map((w,wi) => <div key={wi} className="text-xs text-amber-600">{w}</div>)}
            </div>
            <div className="text-right">
              <div className="font-secondary font-bold text-lg text-indigo-650">{fmt(plan.total)}</div>
              <div className="text-xs text-green-600 font-secondary font-bold">-{Math.round((1-plan.total/totalNY)*100)}%</div>
            </div>
            {plan.id===bestPlan?.id && <Check className="w-5 h-5 text-green-500 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Partial combo suggestions */}
      {(comboSuggestions||[]).filter(s=>s.partial).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>Thêm dịch vụ để kích hoạt Combo Siêu Hời</span>
          </div>
          {comboSuggestions.filter(s=>s.partial).map((s,i) => (
            <div key={i} className="text-sm text-amber-700">
              • <strong>{s.combo?.TenCombo}</strong>: cần thêm {(s.missingIds||[]).join(', ')}
            </div>
          ))}
        </div>
      )}

      {/* Detail table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-secondary uppercase tracking-wider font-bold text-slate-700 text-sm">
          Chi tiết dịch vụ ({(detailLines||[]).length})
        </div>
        {(detailLines||[]).map((line,i) => (
          <div key={i} className={`px-4 py-3 flex items-start gap-3 border-b border-slate-50 last:border-0 ${i%2?'bg-slate-50/40':''}`}>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-800 leading-snug">{line.serviceName}</div>
              {line.quantity>1 && <div className="text-xs text-slate-400">×{line.quantity}</div>}
              {line.gift && (
                <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                  <Gift className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span>{line.gift}</span>
                </div>
              )}
              {line.comboId && (
                <div className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>{line.comboId}</span>
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-slate-400 line-through">{fmt(line.lineNY)}</div>
              <div className="font-secondary font-bold text-indigo-650 text-base">{fmt(line.lineTQ)}</div>
            </div>
          </div>
        ))}
        <div className="px-4 py-3.5 flex justify-between font-bold text-slate-800 bg-slate-50 border-t border-slate-200 items-center">
          <span className="font-secondary uppercase tracking-wider text-sm">Tổng (phương án tối ưu)</span>
          <span className="text-indigo-600 font-secondary font-bold text-2xl">{fmt(bestPlan?.total)}</span>
        </div>
      </div>

      {/* Warnings */}
      {(warnings||[]).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
          <div className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Lưu ý áp dụng</span>
          </div>
          {warnings.map((w,i) => <div key={i} className="text-xs text-amber-700">• {w}</div>)}
        </div>
      )}

      {/* Standard notes */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-500 font-medium">
        <div>• Báo giá có hiệu lực 7 ngày kể từ ngày tư vấn.</div>
        <div>• KM Sinh nhật chỉ áp dụng tại CS OceanPark, không cộng với Combo Siêu Hời.</div>
        <div>• Giá đã bao gồm CTKM thường quy TQ-01 hiện hành.</div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 no-print pb-4">
        <button onClick={() => window.print()}
          className="py-3 rounded-xl bg-slate-100 text-slate-700 font-secondary font-bold tracking-wider text-xs uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5">
          <Printer className="w-4 h-4" />
          <span>In báo giá</span>
        </button>
        <button onClick={() => onSave()} disabled={loading}
          className="py-3 bg-brand-gradient text-white rounded-xl font-secondary font-bold tracking-wider text-sm uppercase hover:opacity-95 disabled:opacity-50 transition-all shadow-lg shadow-brand-orange/30 active:scale-95 flex items-center justify-center gap-1.5">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu báo giá</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
