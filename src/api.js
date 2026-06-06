const BASE = import.meta.env.VITE_GAS_URL

async function request(method, path, params = {}, body = null) {
  const url = new URL(BASE)
  url.searchParams.set('path', path)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const options = { method, redirect: 'follow' }
  if (body) {
    options.headers = { 'Content-Type': 'text/plain;charset=utf-8' }
    options.body = JSON.stringify(body)
  }
  const res = await fetch(url.toString(), options)
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Lỗi API')
  return data
}

export const API = {
  health:       ()       => request('GET',  'health'),
  getServices:  (p)      => request('GET',  'services',       p || {}),
  getCombos:    ()       => request('GET',  'combos'),
  getRules:     ()       => request('GET',  'rules'),
  getStaff:     (branch) => request('GET',  'staff',          { branch }),
  calculate:    (body)   => request('POST', 'calculate',      {}, body),
  getQuotes:    (p)      => request('GET',  'quotes',         p || {}),
  getQuote:     (id)     => request('GET',  'quotes',         { id }),
  createQuote:  (body)   => request('POST', 'quotes',         {}, body),
  approveQuote: (body)   => request('POST', 'quotes/approve', {}, body),
  deposit:      (body)   => request('POST', 'quotes/deposit', {}, body),
  getDashboard: (branch) => request('GET',  'dashboard',      { branch }),
}
