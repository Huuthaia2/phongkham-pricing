const BASE = import.meta.env.VITE_GAS_URL
const isConfigured = BASE && BASE.startsWith('http')

// Mock local data for offline development
const MOCK_DATA = {
  services: [
    { MaDichVu: "DV001", TenDichVu: "Nâng mũi cấu trúc Dr. Hoàng Tuấn", NhomDichVu: "Phẫu thuật thẩm mỹ", GiaNiemYet: 25000000, GiaSauKM: 20000000, PhanTramKM: 0.2, DonViTinh: "Dịch vụ", GhiChu: "Đã bao gồm bọc sụn tai", NhomKM: "TQ-01", ApDungDongThoi_TQ: "Có" },
    { MaDichVu: "DV002", TenDichVu: "Cắt mí Pro Mini Deep", NhomDichVu: "Phẫu thuật thẩm mỹ", GiaNiemYet: 12000000, GiaSauKM: 9000000, PhanTramKM: 0.25, DonViTinh: "Dịch vụ", NhomKM: "TQ-01", ApDungDongThoi_TQ: "Có" },
    { MaDichVu: "DV003", TenDichVu: "Trị mụn công nghệ cao Laser", NhomDichVu: "Da liễu thẩm mỹ", GiaNiemYet: 2000000, GiaSauKM: 1500000, PhanTramKM: 0.25, DonViTinh: "Lần", NhomKM: "TQ-01", ApDungDongThoi_TQ: "Có" },
    { MaDichVu: "DV004", TenDichVu: "Nâng cơ trẻ hóa Ultherapy", NhomDichVu: "Da liễu thẩm mỹ", GiaNiemYet: 45000000, GiaSauKM: 35000000, PhanTramKM: 0.22, DonViTinh: "Dịch vụ", QuaTang: "Tặng 1 buổi chăm sóc da chuyên sâu", NhomKM: "TQ-01", ApDungDongThoi_TQ: "Có" }
  ],
  combos: [
    { MaCombo: "CB001", TenCombo: "Combo Mắt Đẹp + Mũi Cao", LoaiGia: "GIA_TONG", GiaCombo: 27000000, PhanTramGiam: 0, DieuKienApDung: "DV001 + DV002", TrangThai: "Đang áp dụng" },
    { MaCombo: "CB002", TenCombo: "Mũi cao kèm DV lẻ", LoaiGia: "GIA_ANCHOR", GiaCombo: 18000000, PhanTramGiam: 0, DieuKienApDung: "DV001* + TQ01>=1500000", TrangThai: "Đang áp dụng" },
    { MaCombo: "CB003", TenCombo: "Da liễu tiết kiệm", LoaiGia: "GIAM_PHAN_TRAM", GiaCombo: 0, PhanTramGiam: 0.2, DieuKienApDung: "DV003* + DV004", TrangThai: "Đang áp dụng" }
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
    if (path === 'coso') return { success: true, cosos: [
      { MaCoso: 'CS-01', TenCoSo: 'Cơ sở Hoàng Quốc Việt', DiaChi: 'Số 1/487 Hoàng Quốc Việt, Hà Nội' },
      { MaCoso: 'CS-02', TenCoSo: 'Cơ sở Văn Quán', DiaChi: 'Số 38-40 BT8, KĐT Văn Quán, Hà Đông' },
      { MaCoso: 'CS-03', TenCoSo: 'Cơ sở Ocean Park', DiaChi: 'Số 120-122 San Hô 06, KĐT Vinhomes Ocean Park' },
      { MaCoso: 'CS-04', TenCoSo: 'Cơ sở Hạ Long', DiaChi: 'Số 10, Phú Gia 1, Vinhomes Dragon Bay' },
      { MaCoso: 'CS-05', TenCoSo: 'Cơ sở Hải Phòng', DiaChi: 'Số 12B, Manhattan 09, Vinhomes Imperia' },
    ]}
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
      const items = body.items || []
      const services = MOCK_DATA.services
      const combos = MOCK_DATA.combos

      let totalNY = 0, totalTQ = 0
      const detailLines = []
      const gifts = []

      items.forEach(item => {
        const svc = services.find(s => s.MaDichVu === item.serviceId)
        if (!svc) return
        const qty = item.quantity || 1
        const lineNY = svc.GiaNiemYet * qty
        const lineTQ = (svc.GiaSauKM || svc.GiaNiemYet) * qty
        totalNY += lineNY
        totalTQ += lineTQ
        if (svc.QuaTang) gifts.push(svc.QuaTang)
        detailLines.push({ serviceId: item.serviceId, serviceName: svc.TenDichVu, quantity: qty, lineNY, lineTQ, comboId: '', gift: svc.QuaTang || '' })
      })

      const selectedIds = detailLines.map(d => d.serviceId)

      // Gợi ý combo nếu chọn thiếu dịch vụ
      const comboSuggestions = []
      combos.forEach(cb => {
        const matched = cb.DanhSachDichVu.filter(id => selectedIds.includes(id))
        if (matched.length > 0 && matched.length < cb.DanhSachDichVu.length) {
          const missingIds = cb.DanhSachDichVu.filter(id => !selectedIds.includes(id))
          comboSuggestions.push({
            combo: cb,
            partial: true,
            missingIds: missingIds.map(id => {
              const s = services.find(sv => sv.MaDichVu === id)
              return s ? s.TenDichVu : id
            })
          })
        }
      })

      // Kiểm tra combo đầy đủ
      let bestComboTotal = totalTQ, appliedComboId = '', appliedComboName = ''
      combos.forEach(cb => {
        if (cb.DanhSachDichVu.every(id => selectedIds.includes(id))) {
          const outsideSum = detailLines.filter(l => !cb.DanhSachDichVu.includes(l.serviceId)).reduce((a, l) => a + l.lineTQ, 0)
          const totalWithCombo = cb.GiaCombo + outsideSum
          if (totalWithCombo < bestComboTotal) {
            bestComboTotal = totalWithCombo; appliedComboId = cb.MaCombo; appliedComboName = cb.TenCombo
          }
        }
      })

      // KM Sinh nhật theo tier (mock)
      const hasBirthday = body.hasBirthday
      const groupCount = body.groupCount || 1
      const specialType = body.specialType || ''
      const KMSN_TIERS = [
        { ma: 'KMSN-04', ten: 'Bill ≥150tr', bill: 150000000, giam: 10000000 },
        { ma: 'KMSN-03', ten: 'Bill ≥100tr', bill: 100000000, giam: 5000000 },
        { ma: 'KMSN-02', ten: 'Bill ≥60tr',  bill: 60000000,  giam: 3000000 },
        { ma: 'KMSN-01', ten: 'Bill ≥30tr',  bill: 30000000,  giam: 1000000 },
      ]
      const kmsnApplied = []
      let snDiscountTotal = 0
      if (hasBirthday) {
        const billTier = KMSN_TIERS.find(t => totalTQ >= t.bill)
        if (billTier) kmsnApplied.push(billTier)
        if (groupCount >= 3) kmsnApplied.push({ ma: 'KMSN-06', ten: 'Nhóm ≥3', giam: 1000000 })
        else if (groupCount >= 2) kmsnApplied.push({ ma: 'KMSN-05', ten: 'Nhóm ≥2', giam: 500000 })
        const isStudent = specialType === 'HS/SV/GV' || specialType === 'Du học sinh'
        if (isStudent) {
          if (groupCount >= 2) kmsnApplied.push({ ma: 'KMSN-08', ten: 'Nhóm HS/SV ≥2', giam: 1000000 })
          else kmsnApplied.push({ ma: 'KMSN-07', ten: 'HS/SV/GV', giam: 500000 })
        }
        snDiscountTotal = kmsnApplied.reduce((s, k) => s + k.giam, 0)
      }
      const totalSN = totalTQ - snDiscountTotal
      const snMas = kmsnApplied.map(k => k.ma).join(' + ')

      const plans = [
        { id: "p1", label: "Chỉ áp dụng CTKM thường quy TQ-01", total: totalTQ, promos: [], warnings: [] }
      ]
      if (hasBirthday && snDiscountTotal > 0) {
        plans.push({ id: "p2", label: `Áp dụng KM Sinh nhật (${snMas})`, total: totalSN,
          promos: kmsnApplied.map(k => `${k.ma} – ${k.ten}: -${k.giam.toLocaleString('vi-VN')}đ`), warnings: [] })
      }
      if (appliedComboId) plans.push({ id: "p3", label: "Áp dụng Combo: " + appliedComboName, total: bestComboTotal, promos: ["Combo " + appliedComboName], warnings: [] })
      plans.sort((a, b) => a.total - b.total)
      const bestPlan = plans[0]
      const tienGiam = totalNY - bestPlan.total
      const tiLeGiam = totalNY > 0 ? tienGiam / totalNY : 0

      return {
        success: true,
        totalNY, totalTQ,
        totalSN: hasBirthday ? totalSN : null,
        tienGiam, tiLeGiam,
        bestPlan, allPlans: plans,
        detailLines, gifts,
        warnings: [],
        comboSuggestions,
        kmsnApplied,
        needsApproval: tiLeGiam > 0.5
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
  getCoso:      ()       => request('GET',  'coso'),
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
