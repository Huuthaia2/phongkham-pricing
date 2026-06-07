import React, { useState, useEffect } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import ServicePicker from '../components/ServicePicker'
import PriceResult from '../components/PriceResult'
import { CakeSlice, Users, AlertTriangle, Loader2 } from 'lucide-react'

function CustomerForm({ onNext }) {
  const { customer, setCustomer, user } = useStore()
  const [cosos, setCosos] = useState([])
  useEffect(() => {
    API.getCoso().then(d => setCosos(d.cosos || [])).catch(() => {})
  }, [])
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4 animate-slideUp">
      <div className="font-secondary uppercase tracking-wider font-bold text-slate-800 text-base">Thông tin khách hàng</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Họ tên KH *</label>
          <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Nguyễn Thị A" value={customer.name} onChange={e=>setCustomer({name:e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Số điện thoại *</label>
          <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="09xx..." value={customer.phone} onChange={e=>setCustomer({phone:e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Ngày tư vấn</label>
          <input type="date" className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={customer.consultDate} onChange={e=>setCustomer({consultDate:e.target.value})} />
        </div>
        <div>
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Cơ sở</label>
          <select className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={customer.branch} onChange={e=>setCustomer({branch:e.target.value})}>
            {cosos.length > 0
              ? cosos.map(c => <option key={c.MaCoso} value={c.MaCoso}>{c.TenCoSo}</option>)
              : <>
                  <option value="CS-01">Cơ sở Hoàng Quốc Việt</option>
                  <option value="CS-02">Cơ sở Văn Quán</option>
                  <option value="CS-03">Cơ sở Ocean Park</option>
                  <option value="CS-04">Cơ sở Hạ Long</option>
                  <option value="CS-05">Cơ sở Hải Phòng</option>
                </>
            }
          </select>
        </div>
        <div>
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Tư vấn viên</label>
          <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-500"
            value={user?.HoTen||''} readOnly />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-3">
        <div className="text-xs font-secondary tracking-wider font-bold text-slate-400 uppercase">Điều kiện KM đặc biệt</div>

        {customer.branch === 'CS-03' && (
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative w-11 h-6 flex-shrink-0" onClick={()=>setCustomer({hasBirthday:!customer.hasBirthday})}>
              <div className={`w-11 h-6 rounded-full transition-colors ${customer.hasBirthday?'bg-pink-500':'bg-slate-300'}`} />
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${customer.hasBirthday?'left-[22px]':'left-0.5'}`} />
            </div>
            <span className="text-sm text-slate-700 flex items-center gap-1.5">
              <CakeSlice className="w-4 h-4 text-pink-500" />
              <span>KH có sinh nhật trong tháng (chỉ Ocean Park)</span>
            </span>
          </label>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 min-w-max flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Số khách đi cùng:</span>
          </span>
          <button className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
            onClick={()=>setCustomer({groupCount:Math.max(1,customer.groupCount-1)})}>−</button>
          <span className="font-bold w-6 text-center text-slate-800">{customer.groupCount}</span>
          <button className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200"
            onClick={()=>setCustomer({groupCount:customer.groupCount+1})}>+</button>
          <span className="text-xs text-slate-400">người</span>
        </div>

        <div>
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Đối tượng đặc biệt</label>
          <select className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={customer.specialType} onChange={e=>setCustomer({specialType:e.target.value})}>
            <option value="none">Không</option>
            <option value="student">HS / SV / GV / Du học sinh</option>
            <option value="student_group">Nhóm HS/SV/GV ≥ 2 người</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-secondary tracking-wider text-slate-500 uppercase">Ghi chú tư vấn</label>
          <textarea className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" rows={2}
            placeholder="Ghi chú thêm..." value={customer.note} onChange={e=>setCustomer({note:e.target.value})} />
        </div>
      </div>

      <button onClick={onNext} disabled={!customer.name.trim() || !customer.phone.trim()}
        className="w-full py-3.5 bg-brand-gradient text-white rounded-xl font-secondary font-bold tracking-wider text-sm uppercase shadow hover:opacity-95 disabled:opacity-40 transition-all active:scale-95">
        Tiếp tục → Chọn dịch vụ
      </button>
    </div>
  )
}

export default function NewQuotePage() {
  const { user, customer, cart, clearCart, calcResult, setCalcResult, setActiveTab, bumpQuotesVersion } = useStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { clearCart(); setCalcResult(null); setStep(1) }, [])

  async function handleCalculate() {
    if (!cart.length) { setError('Chưa chọn dịch vụ nào'); return }
    setLoading(true); setError('')
    try {
      const result = await API.calculate({
        items: cart.map(i => ({ serviceId: i.serviceId, quantity: i.quantity })),
        branch: customer.branch,
        hasBirthday: customer.hasBirthday,
        groupCount: customer.groupCount,
        specialType: customer.specialType,
      })
      setCalcResult(result)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!calcResult) return
    setLoading(true); setError('')
    try {
      const result = await API.createQuote({
        customerName: customer.name,
        phone: customer.phone,
        branch: customer.branch,
        consultDate: customer.consultDate,
        staffId: user?.MaNhanVien,
        staffName: user?.HoTen,
        hasBirthday: customer.hasBirthday,
        groupCount: customer.groupCount,
        specialType: customer.specialType,
        note: customer.note,
        items: cart.map(i => ({ serviceId: i.serviceId, quantity: i.quantity })),
        calcResult,
      })
      alert(`✅ Đã lưu báo giá ${result.maBaoGia}${result.row ? ` (Dòng ${result.row})` : ''}${result.needsApproval ? '\n⚠️ Cần Quản lý duyệt (giảm >50%)' : ''}`)
      clearCart(); setCalcResult(null); setStep(1)
      bumpQuotesVersion()
      setActiveTab('quotes')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Thông tin KH', 'Chọn dịch vụ', 'Kết quả & Lưu']
  const cartTotal = cart.reduce((s,i) => s+(Number(i._svc?.GiaSauKM)||0)*i.quantity, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 no-print">
        {steps.map((s,i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-1.5 ${i+1<=step?'text-indigo-600':'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-secondary font-bold transition-all
                ${i+1<step?'bg-indigo-600 text-white':i+1===step?'bg-indigo-600 text-white ring-4 ring-indigo-100':'bg-slate-200 text-slate-500'}`}>
                {i+1<step?'✓':i+1}
              </div>
              <span className="hidden sm:block text-xs font-secondary uppercase tracking-wider font-bold">{s}</span>
            </div>
            {i<steps.length-1 && <div className={`flex-1 h-0.5 ${i+1<step?'bg-indigo-400':'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && <CustomerForm onNext={() => setStep(2)} />}

      {step === 2 && (
        <div className="pb-24">
          <ServicePicker />
        </div>
      )}

      {step === 2 && (
        <div className="fixed bottom-16 sm:bottom-4 left-0 sm:left-16 right-0 z-20 no-print px-3 sm:px-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 bg-slate-50/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg border border-slate-200/60">
              <button onClick={() => { clearCart(); setCalcResult(null); setStep(1) }}
                className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-secondary font-bold tracking-wider text-xs uppercase hover:bg-slate-50">
                ← Quay lại
              </button>
              <button onClick={handleCalculate} disabled={!cart.length || loading}
                className="flex-1 py-3.5 bg-brand-gradient text-white rounded-xl font-secondary font-bold tracking-wider text-sm uppercase disabled:opacity-40 hover:opacity-95 transition-all shadow-lg shadow-brand-orange/30 active:scale-95 flex items-center justify-center gap-1.5">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tính...</span>
                  </>
                ) : `Tính giá ${cart.length} dịch vụ →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && calcResult && (
        <PriceResult result={calcResult} onBack={() => setStep(2)} onSave={handleSave} loading={loading} />
      )}
    </div>
  )
}
