const BASE = import.meta.env.VITE_GAS_URL
const isConfigured = BASE && BASE.startsWith('http')

// Mock local data for offline development
const MOCK_DATA = {
  services: [
    { MaDichVu: "DV001", TenDichVu: "Nâng mũi cấu trúc Dr. Hoàng Tuấn", NhomDichVu: "Phẫu thuật thẩm mỹ", GiaNiemYet: 25000000, GiaSauKM: 20000000, PhanTramKM: 0.2, DonViTinh: "Dịch vụ", GhiChu: "Đã bao gồm bọc sụn tai" },
    { MaDichVu: "DV002", TenDichVu: "Cắt mí Pro Mini Deep", NhomDichVu: "Phẫu thuật thẩm mỹ", GiaNiemYet: 12000000, GiaSauKM: 9000000, PhanTramKM: 0.25, DonViTinh: "Dịch vụ" },
    { MaDichVu: "DV003", TenDichVu: "Trị mụn công nghệ cao Laser", NhomDichVu: "Da liễu thẩm mỹ", GiaNiemYet: 2000000, GiaSauKM: 1500000, PhanTramKM: 0.25, DonViTinh: "Lần" },
    { MaDichVu: "DV004", TenDichVu: "Nâng cơ trẻ hóa Ultherapy", NhomDichVu: "Da liễu thẩm mỹ", GiaNiemYet: 45000000, GiaSauKM: 35000000, PhanTramKM: 0.22, DonViTinh: "Dịch vụ", QuaTang: "Tặng 1 buổi chăm sóc da chuyên sâu" }
  ],
  combos: [
    { MaCombo: "CB001", TenCombo: "Combo Mắt Đẹp + Mũi Cao", DanhSachDichVu: ["DV001", "DV002"], GiaCombo: 27000000 }
  ],
  rules: [],
  staff: [
    { MaNhanVien: "NV001", HoTen: "Hoàng Tuấn Admin", Role: "Admin", Email: "admin@phongkham.vn", SoDienThoai: "admin", CoSo: "OceanPark (OCP)", TrangThai: "Đang làm việc" },
    { MaNhanVien: "NV002", HoTen: "Tư Vấn Viên A", Role: "Tư vấn viên", Email: "tvv@phongkham.vn", SoDienThoai: "tvv", CoSo: "OceanPark (OCP)", TrangThai: "Đang làm việc" },
    { MaNhanVien: "NV003", HoTen: "Thu Ngân OCP", Role: "Thu ngân", Email: "cashier@phongkham.vn", SoDienThoai: "cashier", CoSo: "OceanPark (OCP)", TrangThai: "Đang làm việc" }
  ],
  quotes: [
    { MaBaoGia: "BG0001", HoTenKhachHang: "Nguyễn Thị Hoa", NgayTuVan: "2026-06-07", TenTuVanVien: "Tư Vấn Viên A", GiaToiUu: 20000000, TrangThaiBaoGia: "Đã chốt", CoSo: "OceanPark", SoDienThoai: "0912345678", TiLeGiam: 0.2, DaDatCoc: "Đã cọc", SoTienCoc: 5000000 },
    { MaBaoGia: "BG0002", HoTenKhachHang: "Trần Văn Nam", NgayTuVan: "2026-06-07", TenTuVanVien: "Tư Vấn Viên A", GiaToiUu: 9000000, TrangThaiBaoGia: "Chờ duyệt", CoSo: "OceanPark", SoDienThoai: "0987654321", TiLeGiam: 0.25 }
  ],
  dashboard: {
    kpis: { totalQuotes: 12, totalNY: 120000000, totalToiUu: 95000000, avgDiscount: 0.21, chotCount: 8, waitCount: 3, conversionRate: 0.66, totalGiam: 25000000 },
    warnings: { missingPrice: 0, needVerify: 0, pendingApproval: 1 },
    recentQuotes: [
      { MaBaoGia: "BG0001", HoTenKhachHang: "Nguyễn Thị Hoa", NgayTuVan: "2026-06-07", TenTuVanVien: "Tư Vấn Viên A", GiaToiUu: 20000000, TrangThaiBaoGia: "Đã chốt" },
      { MaBaoGia: "BG0002", HoTenKhachHang: "Trần Văn Nam", NgayTuVan: "2026-06-07", TenTuVanVien: "Tư Vấn Viên A", GiaToiUu: 9000000, TrangThaiBaoGia: "Chờ duyệt" }
    ]
  }
}

async function request(method, path, params = {}, body = null) {
  if (!isConfigured) {
    // Return mock data for local testing when VITE_GAS_URL is missing
    await new Promise(r => setTimeout(r, 400)) // simulated lag
    if (path === 'health') return { success: true }
    if (path === 'services') return { success: true, services: MOCK_DATA.services, groups: ["Phẫu thuật thẩm mỹ", "Da liễu thẩm mỹ"] }
    if (path === 'combos') return { success: true, combos: MOCK_DATA.combos }
    if (path === 'rules') return { success: true, rules: MOCK_DATA.rules }
    if (path === 'staff') return { success: true, staff: MOCK_DATA.staff }
    if (path === 'dashboard') return { success: true, ...MOCK_DATA.dashboard }
    if (path === 'quotes') {
      if (params.id) {
        const match = MOCK_DATA.quotes.find(q => q.MaBaoGia === params.id)
        if (!match) throw new Error('Không tìm thấy báo giá')
        return { success: true, quote: match }
      }
      return { success: true, quotes: MOCK_DATA.quotes }
    }
    if (path === 'calculate') {
      // Basic mock calculation result
      const selected = body.services || []
      const totalNY = selected.reduce((acc, s) => acc + (s.GiaNiemYet || 0) * (s.quantity || 1), 0)
      const totalTQ = selected.reduce((acc, s) => acc + (s.GiaSauKM || 0) * (s.quantity || 1), 0)
      return {
        success: true,
        totalNY,
        totalTQ,
        tienGiam: totalNY - totalTQ,
        tiLeGiam: (totalNY - totalTQ) / totalNY || 0,
        bestPlan: { id: "p1", label: "Áp dụng TQ-01 + Ưu đãi ngày vàng", total: totalTQ * 0.95, promos: ["Giảm 5% Ngày vàng"], warnings: [] },
        allPlans: [
          { id: "p1", label: "Áp dụng TQ-01 + Ưu đãi ngày vàng", total: totalTQ * 0.95, promos: ["Giảm 5% Ngày vàng"], warnings: [] },
          { id: "p2", label: "Chỉ áp dụng CTKM thường quy", total: totalTQ, promos: [], warnings: [] }
        ],
        detailLines: selected.map(s => ({
          serviceName: s._svc?.TenDichVu || s.serviceId,
          quantity: s.quantity,
          lineNY: (s._svc?.GiaNiemYet || 0) * s.quantity,
          lineTQ: (s._svc?.GiaSauKM || 0) * s.quantity
        })),
        gifts: [],
        warnings: [],
        comboSuggestions: []
      }
    }
    if (path === 'quotes/approve' || path === 'quotes/deposit') {
      return { success: true }
    }
    return { success: true }
  }

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
