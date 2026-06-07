import React, { useState } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import logo from '../assets/1024x1024-logo-1.png'

const GAS_URL = import.meta.env.VITE_GAS_URL
const isConfigured = GAS_URL && GAS_URL.startsWith('http')

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
      const input = String(email || '').toLowerCase().trim()
      const match = (data.staff || []).find(s => {
        const sEmail = String(s.Email || '').toLowerCase().trim()
        const sPhone = String(s.SoDienThoai || '').trim()
        return sEmail === input || sPhone === input
      })
      if (!match) throw new Error('Không tìm thấy tài khoản. Kiểm tra lại email hoặc SĐT.')
      if (String(match.TrangThai || '').trim() !== 'Đang làm việc') {
        throw new Error('Tài khoản đã bị vô hiệu hóa.')
      }
      setUser(match)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-2 mx-auto mb-4 shadow-2xl overflow-hidden">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-logo tracking-wider text-white uppercase leading-snug">Hệ thống chăm sóc sức khoẻ chủ động Hoàng Tuấn</h1>
          <p className="text-indigo-200 font-secondary tracking-wide text-xs uppercase mt-1.5">Hệ thống tính giá dịch vụ nội bộ</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl border border-indigo-900/10">
          <h2 className="font-secondary tracking-wider uppercase font-bold text-slate-800 mb-5 text-xl">Đăng nhập</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-secondary tracking-wider text-slate-500 uppercase mb-1.5">
                Email hoặc Số điện thoại
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                placeholder="email@phongkham.vn hoặc 09xx..."
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-medium">
                ⚠️ {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 bg-brand-gradient text-white rounded-xl font-secondary font-bold tracking-wider text-sm uppercase hover:opacity-95 disabled:opacity-50 transition-all shadow-lg shadow-brand-orange/30 hover:scale-[1.01] active:scale-95"
            >
              {loading ? '⏳ Đang xác thực...' : 'Đăng nhập →'}
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-4 font-medium">
            Liên hệ Admin nếu không đăng nhập được
          </p>
        </div>
      </div>
    </div>
  )
}