import React, { useState } from 'react'
import { API } from '../api'
import { useStore } from '../store'

export default function LoginPage() {
  const { setUser } = useStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await API.getStaff()
      const match = (data.staff || []).find(s =>
        s.Email?.toLowerCase().trim() === email.toLowerCase().trim() ||
        s.SoDienThoai?.trim() === email.trim()
      )
      if (!match) throw new Error('Không tìm thấy tài khoản. Kiểm tra lại email hoặc SĐT.')
      if (match.TrangThai !== 'Đang làm việc') throw new Error('Tài khoản đã bị vô hiệu hóa.')
      setUser(match)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-5xl mx-auto mb-4 shadow-2xl">💎</div>
          <h1 className="text-2xl font-bold text-white">Phòng Khám Thẩm Mỹ</h1>
          <p className="text-indigo-300 text-sm mt-1">Hệ thống tính giá dịch vụ nội bộ</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h2 className="font-bold text-slate-800 mb-5 text-lg">Đăng nhập</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email hoặc Số điện thoại</label>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                placeholder="email@phongkham.vn hoặc 09xx..." value={email} onChange={e=>setEmail(e.target.value)} autoFocus required />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">⚠️ {error}</div>}
            <button type="submit" disabled={loading || !email.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200">
              {loading ? '⏳ Đang xác thực...' : 'Đăng nhập →'}
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-5">Liên hệ Admin nếu không đăng nhập được</p>
        </div>
      </div>
    </div>
  )
}
