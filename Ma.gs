// ============================================================
// Ma.gs — Backend API v2 (schema v3, 17-table)
// Đọc từ Google Sheet được tạo bởi Setup_KM_Database.gs
// Endpoints: services, combos, rules, coso, staff,
//            calculate, quotes (BQ_Header / BQ_ChiTiet)
// ============================================================

const CONFIG = {
  SHEETS: {
    SERVICES:           'services',
    SERVICE_PRICES:     'service_prices',
    SERVICE_CATEGORIES: 'service_categories',
    COMBOS:             'combos',
    COMBO_ITEMS:        'combo_items',
    PROMOTIONS:         'promotions',
    PROMO_RULES:        'promo_rules',
    RULE_CONDITIONS:    'rule_conditions',
    RULE_REWARDS:       'rule_rewards',
    VOUCHER_TIERS:      'voucher_tiers',
    BRANCHES:           'branches',
    EMPLOYEES:          'employees',
    // Quote sheets — tự tạo bằng ensureBQSheets_() nếu chưa có
    BQ_HEADER:          'BQ_Header',
    BQ_DETAIL:          'BQ_ChiTiet',
  },
  APPROVAL_THRESHOLD:  0.5,
  QUOTE_VALIDITY_DAYS: 7,
};

// ============================================================
// 1. HTTP ENTRY POINTS
// ============================================================

function doGet(e) {
  try {
    const path = e.parameter.path;
    let result;
    if      (path === 'health')    result = makeSuccess({ status: 'OK' });
    else if (path === 'services')  result = handleGetServices(e.parameter);
    else if (path === 'combos')    result = handleGetCombos();
    else if (path === 'rules')     result = handleGetRules();
    else if (path === 'coso')      result = handleGetCoso();
    else if (path === 'staff')     result = handleGetStaff(e.parameter.branch);
    else if (path === 'quotes') {
      if (e.parameter.id) result = handleGetQuote(e.parameter.id);
      else                result = handleGetQuotes(e.parameter);
    }
    else if (path === 'dashboard') result = handleGetDashboard(e.parameter.branch);
    else result = makeError('Đường dẫn không hợp lệ: ' + path, 400);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify(makeError(err.toString(), 500)))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const path = e.parameter.path;
    let body = null;
    if (e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    let result;
    if      (path === 'quotes')           result = handleCreateQuote(body);
    else if (path === 'quotes/approve')   result = handleApproveQuote(body);
    else if (path === 'quotes/deposit')   result = handleDepositQuote(body);
    else if (path === 'quotes/delete')    result = handleDeleteQuote(body);
    else if (path === 'calculate')        result = handleCalculate(body);
    else result = makeError('Đường dẫn không hợp lệ: ' + path, 400);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify(makeError(err.toString(), 500)))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 2. SHEET UTILITIES (dùng chung cho mọi sheet)
// ============================================================

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + sheetName);
  return sh;
}

// Tự động tìm dòng header (row 1-5 đầu tiên có > 3 ô không rỗng).
// Phù hợp cả sheet cũ (header row 1) lẫn sheet mới (header row 3).
function getHeaderRowInfo(sh) {
  const data = sh.getRange(1, 1, Math.min(5, sh.getLastRow() || 1), Math.max(1, sh.getLastColumn())).getValues();
  let headerIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].filter(c => c !== '' && c !== null).length > 3) { headerIdx = i; break; }
  }
  return { index: headerIdx + 1, headers: data[headerIdx].map(h => String(h).trim()) };
}

function getSheetData(sheetName) {
  const sh = getSheet(sheetName);
  const hi = getHeaderRowInfo(sh);
  const lastRow = sh.getLastRow();
  if (lastRow <= hi.index) return [];
  const data = sh.getRange(hi.index + 1, 1, lastRow - hi.index, hi.headers.length).getValues();
  return data.map(row => {
    const obj = {};
    hi.headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(sheetName, obj) {
  const sh = getSheet(sheetName);
  const hi = getHeaderRowInfo(sh);
  const rowData = hi.headers.map(h => obj[h] !== undefined ? obj[h] : '');
  const writeRow = sh.getLastRow() + 1;
  sh.getRange(writeRow, 1, 1, rowData.length).setValues([rowData]);
  return { rowNum: writeRow };
}

function updateRow(sheetName, keyField, keyValue, updates) {
  const sh = getSheet(sheetName);
  const hi = getHeaderRowInfo(sh);
  const keyIdx = hi.headers.indexOf(keyField);
  if (keyIdx === -1) throw new Error('Không tìm thấy cột: ' + keyField);
  const lastRow = sh.getLastRow();
  if (lastRow <= hi.index) return false;
  const vals = sh.getRange(hi.index + 1, 1, lastRow - hi.index, sh.getLastColumn()).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][keyIdx]) === String(keyValue)) {
      const rowNum = hi.index + 1 + i;
      Object.entries(updates).forEach(([field, val]) => {
        const colIdx = hi.headers.indexOf(field);
        if (colIdx !== -1) sh.getRange(rowNum, colIdx + 1).setValue(val);
      });
      return true;
    }
  }
  return false;
}

// ============================================================
// 3. ĐỌCDANH MỤC
// ============================================================

function handleGetServices(params) {
  const services = getSheetData(CONFIG.SHEETS.SERVICES);
  const prices   = getSheetData(CONFIG.SHEETS.SERVICE_PRICES);
  const cats     = getSheetData(CONFIG.SHEETS.SERVICE_CATEGORIES);

  // category id → tên
  const catMap = {};
  cats.forEach(c => { catMap[String(c.id)] = String(c.category_name || ''); });

  // service_id → base_price (ưu tiên dòng không có branch, is_current=1)
  const priceMap = {};
  prices.forEach(p => {
    if (String(p.is_current) !== '1') return;
    const sid = String(p.service_id);
    if (!p.branch_id || p.branch_id === '') priceMap[sid] = Number(p.base_price) || 0;
    else if (priceMap[sid] === undefined)    priceMap[sid] = Number(p.base_price) || 0;
  });

  const result = services
    .filter(s => String(s.is_active) === '1')
    .map(s => ({
      MaDichVu:          String(s.item_code || s.id),
      TenDichVu:         String(s.item_name || ''),
      NhomDichVu:        catMap[String(s.category_id)] || '',
      GiaNiemYet:        priceMap[String(s.id)] || 0,
      GiaSauKM:          priceMap[String(s.id)] || 0,  // bằng NY — discount tính qua promo_rules
      DonViTinh:         String(s.unit || ''),
      QuaTang:           '',
      NhomKM:            String(s.service_group_code || ''),
      ApDungDongThoi_TQ: 'Có',
    }));

  const groups = [...new Set(result.map(s => s.NhomDichVu).filter(Boolean))];
  return makeSuccess({ services: result, groups });
}

function handleGetCombos() {
  const combos     = getSheetData(CONFIG.SHEETS.COMBOS);
  const comboItems = getSheetData(CONFIG.SHEETS.COMBO_ITEMS);
  const services   = getSheetData(CONFIG.SHEETS.SERVICES);

  // service db_id → item_code
  const codeMap = {};
  services.forEach(s => { codeMap[String(s.id)] = String(s.item_code || s.id); });

  // combo_id → [combo_items]
  const itemsByCombo = {};
  comboItems.forEach(ci => {
    const cid = String(ci.combo_id);
    if (!itemsByCombo[cid]) itemsByCombo[cid] = [];
    itemsByCombo[cid].push(ci);
  });

  const result = combos
    .filter(c => String(c.is_active) === '1')
    .map(c => {
      const items = itemsByCombo[String(c.id)] || [];
      // Chuyển combo_items → DieuKienApDung (EXACT match mỗi DV)
      const cond = items.map(ci => codeMap[String(ci.service_id)] || String(ci.service_id)).join(' + ');
      return {
        MaCombo:        'CB' + String(c.id).padStart(3, '0'),
        TenCombo:       String(c.combo_name || ''),
        LoaiGia:        'GIA_TONG',
        GiaCombo:       Number(c.combo_price) || 0,
        PhanTramGiam:   0,
        DieuKienApDung: cond,
        QuaTang:        '',
        TrangThai:      'Đang áp dụng',
        _excVoucher:    Number(c.exclude_voucher) === 1,
      };
    });

  return makeSuccess({ combos: result });
}

function handleGetCoso() {
  const cosos = getSheetData(CONFIG.SHEETS.BRANCHES)
    .filter(b => String(b.is_active) === '1')
    .map(b => ({
      MaCoso:  String(b.branch_code || ''),
      TenCoSo: String(b.branch_name || ''),
      DiaChi:  String(b.address    || ''),
    }));
  return makeSuccess({ cosos });
}

function handleGetStaff(branch) {
  const branches = getSheetData(CONFIG.SHEETS.BRANCHES);
  const branchById = {};
  branches.forEach(b => { branchById[String(b.id)] = String(b.branch_code || ''); });

  let staff = getSheetData(CONFIG.SHEETS.EMPLOYEES)
    .filter(e => String(e.status || 'ACTIVE').toUpperCase() !== 'INACTIVE')
    .map(e => ({
      MaNhanVien:  String(e.employee_code || ''),
      HoTen:       String(e.full_name     || ''),
      Role:        String(e.role          || ''),
      Email:       String(e.email         || ''),
      SoDienThoai: String(e.phone_number  || ''),
      CoSo:        branchById[String(e.branch_id)] || 'Tất cả',
      TrangThai:   'Đang làm việc',
    }));

  if (branch) {
    staff = staff.filter(e => !e.CoSo || e.CoSo === 'Tất cả' || e.CoSo === branch);
  }
  return makeSuccess({ staff });
}

// Trả về virtual KMSN rules (tương thích frontend cũ) xây từ voucher_tiers + promo_rules
function handleGetRules() {
  const promoRules = getSheetData(CONFIG.SHEETS.PROMO_RULES);
  const conditions = getSheetData(CONFIG.SHEETS.RULE_CONDITIONS);
  const rewards    = getSheetData(CONFIG.SHEETS.RULE_REWARDS);
  const vouchers   = getSheetData(CONFIG.SHEETS.VOUCHER_TIERS);

  const condsByRule = {}, rewsByRule = {};
  conditions.forEach(c => {
    const rid = String(c.rule_id);
    if (!condsByRule[rid]) condsByRule[rid] = [];
    condsByRule[rid].push(c);
  });
  rewards.forEach(r => {
    const rid = String(r.rule_id);
    if (!rewsByRule[rid]) rewsByRule[rid] = [];
    rewsByRule[rid].push(r);
  });

  const virtualRules = [];

  // Voucher tiers → KMSN-01~04
  const billCodes = ['KMSN-01','KMSN-02','KMSN-03','KMSN-04'];
  [...vouchers]
    .sort((a, b) => Number(a.min_bill_amount) - Number(b.min_bill_amount))
    .slice(0, 4)
    .forEach((t, i) => virtualRules.push({
      MaLuatKM:        billCodes[i],
      TenChuongTrinh:  'KM Sinh nhật - Bill ≥' + Number(t.min_bill_amount).toLocaleString('vi-VN') + 'đ',
      BillToiThieu:    Number(t.min_bill_amount),
      GiaTriGiam:      Number(t.voucher_value),
      SoKhachToiThieu: 1,
      TrangThai:       'Đang áp dụng',
    }));

  // Group/attribute rules → KMSN-05+
  let idx = 5;
  promoRules.forEach(rule => {
    const conds = condsByRule[String(rule.id)] || [];
    const rews  = rewsByRule[String(rule.id)]  || [];
    const gc = conds.find(c => c.criteria_type === 'GROUP_SIZE');
    const ac = conds.find(c => c.criteria_type === 'CUSTOMER_ATTRIBUTE');
    const dr = rews.find(r => r.reward_type === 'DISCOUNT_FIXED' || r.reward_type === 'DISCOUNT_PERCENT');
    if ((gc || ac) && dr) {
      virtualRules.push({
        MaLuatKM:        'KMSN-' + String(idx).padStart(2, '0'),
        TenChuongTrinh:  'KM Sinh nhật - ' + String(rule.rule_name || ''),
        BillToiThieu:    0,
        GiaTriGiam:      Number(dr.reward_value || 0),
        SoKhachToiThieu: gc ? Number(gc.value_num || 1) : 1,
        AttrType:        ac ? String(ac.value_text || '') : '',
        TrangThai:       'Đang áp dụng',
      });
      idx++;
    }
  });

  return makeSuccess({ rules: virtualRules });
}

// ============================================================
// 4. TÍNH GIÁ
// ============================================================

function handleCalculate(body) {
  const { items, branch, hasBirthday, groupCount, specialType } = body;
  if (!items || items.length === 0) return makeError('Chưa chọn dịch vụ', 400);

  // ── Load service map ────────────────────────────────────
  const svcMap = buildServiceMap_();  // { byCode: {item_code→obj}, byId: {db_id→item_code} }

  // ── Base detail lines ───────────────────────────────────
  let totalNY = 0;
  const detailLines = [];
  const gifts = [];
  const warnings = [];

  items.forEach(item => {
    const svc = svcMap.byCode[item.serviceId];
    if (!svc) { warnings.push('Không tìm thấy dịch vụ: ' + item.serviceId); return; }
    const qty    = Number(item.quantity) || 1;
    const lineNY = svc.base_price * qty;
    totalNY += lineNY;
    detailLines.push({
      serviceId:   item.serviceId,
      _dbId:       svc.id,
      serviceName: svc.item_name,
      quantity:    qty,
      priceNY:     svc.base_price,
      priceTQ:     svc.base_price,
      lineNY,
      lineTQ:      lineNY,
      comboId:     '',
      comboPrice:  0,
      snDiscount:  0,
      optimalPrice: lineNY,
      gift:        '',
    });
  });

  // ── Apply active promotions ─────────────────────────────
  const activePromos = getActivePromotions_();
  if (activePromos.length > 0) {
    const rulesData = getPromoRulesData_(activePromos.map(p => String(p.id)));

    // SERVICE_SELECTED → FIXED_PRICE: áp giá promo từng DV
    rulesData.forEach(({ conditions, rewards }) => {
      const sc = conditions.find(c => c.criteria_type === 'SERVICE_SELECTED');
      if (!sc) return;
      const fp = rewards.find(r => r.reward_type === 'FIXED_PRICE');
      if (!fp || !fp.reward_value) return;
      const line = detailLines.find(l => l._dbId === Number(sc.target_service_id));
      if (line && Number(fp.reward_value) < line.priceNY) {
        line.priceTQ = Number(fp.reward_value);
        line.lineTQ  = Number(fp.reward_value) * line.quantity;
      }
    });
  }

  let totalTQ = detailLines.reduce((s, l) => s + l.lineTQ, 0);

  // ── KM Sinh nhật: GROUP_SIZE / CUSTOMER_ATTRIBUTE / voucher ──
  let extraDiscount = 0;
  const kmsnApplied = [];

  if (hasBirthday && activePromos.length > 0) {
    const rulesData   = getPromoRulesData_(activePromos.map(p => String(p.id)));
    const curGroup    = Number(groupCount) || 1;
    const sType       = String(specialType || '');

    // Best GROUP_SIZE rule (nhân với số khách)
    let bestGroupDisc = 0, bestGroupRule = null;
    rulesData.forEach(({ rule, conditions, rewards }) => {
      const gc = conditions.find(c => c.criteria_type === 'GROUP_SIZE' && curGroup >= Number(c.value_num || 1));
      if (!gc) return;
      const dr = rewards.find(r => r.reward_type === 'DISCOUNT_FIXED');
      if (!dr) return;
      const total = Number(dr.reward_value) * curGroup;
      if (total > bestGroupDisc) { bestGroupDisc = total; bestGroupRule = { rule, giam: total }; }
    });
    if (bestGroupRule) {
      extraDiscount += bestGroupDisc;
      kmsnApplied.push({ ma: 'GRP', ten: bestGroupRule.rule.rule_name, giam: bestGroupDisc });
    }

    // CUSTOMER_ATTRIBUTE
    rulesData.forEach(({ rule, conditions, rewards }) => {
      const ac = conditions.find(c => c.criteria_type === 'CUSTOMER_ATTRIBUTE');
      if (!ac) return;
      const vt = String(ac.value_text || '');
      const ok =
        (vt === 'STUDENT_TEACHER'             && (sType === 'HS/SV/GV' || sType === 'Du học sinh'))
        || (vt === 'PARENT_OF_EXCELLENT_STUDENT' && sType === 'Phụ huynh HS giỏi')
        || (vt === 'MOTHER_AND_CHILD'            && sType === 'Mẹ và bé')
        || (vt && sType === vt);
      if (!ok) return;
      const dr = rewards.find(r => r.reward_type === 'DISCOUNT_FIXED');
      if (!dr) return;
      extraDiscount += Number(dr.reward_value);
      kmsnApplied.push({ ma: 'ATTR', ten: rule.rule_name, giam: Number(dr.reward_value) });
    });

    // FREE_PRODUCT gifts
    rulesData.forEach(({ rewards }) => {
      rewards.filter(r => r.reward_type === 'FREE_PRODUCT' && r.gift_description)
             .forEach(r => gifts.push(String(r.gift_description)));
    });
  }

  // Voucher tiers (áp theo totalTQ)
  let voucherDiscount = 0;
  if (hasBirthday && activePromos.length > 0) {
    const tiers = getSheetData(CONFIG.SHEETS.VOUCHER_TIERS)
      .filter(t => String(t.promotion_id) === String(activePromos[0].id))
      .sort((a, b) => Number(b.min_bill_amount) - Number(a.min_bill_amount));
    const tier = tiers.find(t => totalTQ >= Number(t.min_bill_amount));
    if (tier) {
      voucherDiscount = Number(tier.voucher_value);
      kmsnApplied.push({
        ma:  'VCH',
        ten: 'Voucher (bill ≥' + Number(tier.min_bill_amount).toLocaleString('vi-VN') + 'đ)',
        giam: voucherDiscount,
      });
    }
  }

  const snTotal = extraDiscount + voucherDiscount;
  const totalSN = totalTQ - snTotal;

  // Phân bổ snDiscount theo tỉ lệ
  if (snTotal > 0) {
    detailLines.forEach(line => {
      line.snDiscount = totalTQ > 0 ? Math.round(snTotal * line.lineTQ / totalTQ) : 0;
    });
  }

  // ── Combo matching ──────────────────────────────────────
  const activeCombos = (handleGetCombos().combos || []).filter(c => c.TrangThai === 'Đang áp dụng');
  const cart = detailLines.map(d => ({ serviceId: d.serviceId, quantity: d.quantity }));
  const svcForMatch = detailLines.map(d => ({ MaDichVu: d.serviceId, GiaSauKM: d.priceTQ }));

  let bestComboTotal = totalTQ;
  let appliedComboId = '', appliedComboName = '', appliedComboResult = null;

  activeCombos.forEach(cb => {
    const mr = matchCombo_(cb, cart, svcForMatch);
    if (!mr || !mr.allMet) return;

    const inIds = mr.conditionResults
      .filter(c => c.type !== 'ANY_TQ01' && c.type !== 'TAG')
      .reduce((a, c) => a.concat(c.matched), []);
    const outside = detailLines.reduce((s, l) => s + (inIds.includes(l.serviceId) ? 0 : l.lineTQ), 0);
    const comboTotal = Number(cb.GiaCombo) + outside;

    if (comboTotal < bestComboTotal) {
      bestComboTotal = comboTotal;
      appliedComboId = cb.MaCombo; appliedComboName = cb.TenCombo; appliedComboResult = mr;
    }
  });

  // Gán comboPrice vào lines
  if (appliedComboId && appliedComboResult) {
    const cb = activeCombos.find(c => c.MaCombo === appliedComboId);
    const inIds = appliedComboResult.conditionResults
      .filter(c => c.type !== 'ANY_TQ01' && c.type !== 'TAG')
      .reduce((a, c) => a.concat(c.matched), []);
    const totalNYinCombo = detailLines.reduce((s, l) => s + (inIds.includes(l.serviceId) ? l.lineNY : 0), 0);
    detailLines.forEach(line => {
      if (!inIds.includes(line.serviceId)) return;
      line.comboId    = cb.MaCombo;
      const ratio     = totalNYinCombo > 0 ? line.lineNY / totalNYinCombo : 0;
      line.comboPrice = Math.round(Number(cb.GiaCombo) * ratio / line.quantity);
      line.optimalPrice = line.comboPrice * line.quantity;
    });
  }

  // ── Build plans ─────────────────────────────────────────
  const plans = [
    { id: 'p1', label: 'Giá CTKM thường quy', total: totalTQ, promos: [], warnings: [] }
  ];

  if (hasBirthday && snTotal > 0) {
    plans.push({
      id:     'p2',
      label:  'CTKM + Ưu đãi sinh nhật',
      total:  totalSN,
      promos: kmsnApplied.map(k => k.ten + ': -' + k.giam.toLocaleString('vi-VN') + 'đ'),
      warnings: [],
    });
  }
  if (appliedComboId) {
    plans.push({
      id:     'p3',
      label:  'Combo: ' + appliedComboName,
      total:  bestComboTotal,
      promos: ['Combo ' + appliedComboName],
      warnings: [],
    });
  }

  plans.sort((a, b) => a.total - b.total);
  const bestPlan = plans[0];
  const tienGiam = totalNY - bestPlan.total;
  const tiLeGiam = totalNY > 0 ? tienGiam / totalNY : 0;

  // Optimal prices per line
  const useSN = hasBirthday && snTotal > 0 && totalSN <= bestComboTotal;
  detailLines.forEach(line => {
    if (useSN && !line.comboId) line.optimalPrice = line.lineTQ - line.snDiscount;
    else if (!line.comboId)     line.optimalPrice = line.lineTQ;
  });

  return makeSuccess({
    totalNY, totalTQ,
    totalSN:       hasBirthday ? totalSN : null,
    bestComboTotal: appliedComboId ? bestComboTotal : null,
    tienGiam, tiLeGiam,
    bestPlan, allPlans: plans,
    detailLines, gifts, warnings,
    kmsnApplied,
    comboSuggestions: [],
    needsApproval: tiLeGiam > CONFIG.APPROVAL_THRESHOLD,
  });
}

// ── Helpers cho tính giá ────────────────────────────────────

function buildServiceMap_() {
  const services = getSheetData(CONFIG.SHEETS.SERVICES);
  const prices   = getSheetData(CONFIG.SHEETS.SERVICE_PRICES);
  const cats     = getSheetData(CONFIG.SHEETS.SERVICE_CATEGORIES);

  const catMap = {};
  cats.forEach(c => { catMap[String(c.id)] = String(c.category_name || ''); });

  const priceMap = {};
  prices.forEach(p => {
    if (String(p.is_current) !== '1') return;
    const sid = String(p.service_id);
    if (!p.branch_id || p.branch_id === '') priceMap[sid] = Number(p.base_price) || 0;
    else if (priceMap[sid] === undefined)    priceMap[sid] = Number(p.base_price) || 0;
  });

  const byCode = {}, byId = {};
  services.forEach(s => {
    const code = String(s.item_code || s.id);
    const obj  = { id: Number(s.id), item_code: code, item_name: String(s.item_name || ''), base_price: priceMap[String(s.id)] || 0 };
    byCode[code]       = obj;
    byId[String(s.id)] = code;
  });
  return { byCode, byId };
}

// Trả về promotions có is_active=1 và nằm trong khoảng ngày hôm nay.
// Nếu start_date/end_date bỏ trống → luôn coi là active.
function getActivePromotions_() {
  const todayStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  return getSheetData(CONFIG.SHEETS.PROMOTIONS).filter(p => {
    if (String(p.is_active) !== '1') return false;
    const start = String(p.start_date || '').substring(0, 10);
    const end   = String(p.end_date   || '').substring(0, 10);
    if (!start && !end) return true;
    return (!start || start <= todayStr) && (!end || end >= todayStr);
  });
}

function getPromoRulesData_(promoIds) {
  const rules      = getSheetData(CONFIG.SHEETS.PROMO_RULES).filter(r => promoIds.includes(String(r.promotion_id)));
  const conditions = getSheetData(CONFIG.SHEETS.RULE_CONDITIONS);
  const rewards    = getSheetData(CONFIG.SHEETS.RULE_REWARDS);
  const condsByRule = {}, rewsByRule = {};
  conditions.forEach(c => { const rid = String(c.rule_id); if (!condsByRule[rid]) condsByRule[rid] = []; condsByRule[rid].push(c); });
  rewards.forEach(r => { const rid = String(r.rule_id); if (!rewsByRule[rid]) rewsByRule[rid] = []; rewsByRule[rid].push(r); });
  return rules.map(r => ({ rule: r, conditions: condsByRule[String(r.id)] || [], rewards: rewsByRule[String(r.id)] || [] }));
}

// ============================================================
// 5. QUOTES — BQ_Header / BQ_ChiTiet
//    (auto-create nếu chưa tồn tại trong GG Sheet)
// ============================================================

function ensureBQSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const HDR = ['MaBaoGia','NgayTuVan','MaNhanVien','TenTuVanVien','CoSo',
    'HoTenKhachHang','SoDienThoai','CoSinhNhat','SoKhachDiCung','DoiTuongDacBiet',
    'GhiChuTuVan','TongGiaNiemYet','TongGiaSauTQ','TongGiaSauSN','TongGiaCombo',
    'GiaToiUu','TienGiam','TiLeGiam','QuyenToiUu','QuaTangTong','CanhBao',
    'TrangThaiBaoGia','DaDatCoc','SoTienCoc','NgayHetHanBaoGia','NguoiDuyetBaoGia','GhiChuDuyet'];
  const DTL = ['MaChiTiet','MaBaoGia','MaDichVu','TenDichVu','SoLuong',
    'GiaNiemYet_DV','GiaSauTQ_DV','ThanhTienNY','ThanhTienTQ',
    'ComboApDung','GiaCombo_DV','ThanhTienCombo','KMSinhNhat_DV','ThanhTienSN',
    'GiaToiUu_DV','QuaTang','GhiChu'];

  [[CONFIG.SHEETS.BQ_HEADER, HDR], [CONFIG.SHEETS.BQ_DETAIL, DTL]].forEach(([name, cols]) => {
    if (!ss.getSheetByName(name)) {
      const sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, cols.length).setValues([cols])
        .setBackground('#BF360C').setFontColor('#FFFFFF').setFontWeight('bold');
      sh.setFrozenRows(1);
      sh.setTabColor('#BF360C');
    }
  });
}

function handleCreateQuote(body) {
  ensureBQSheets_();
  const { customerName, phone, branch, staffId, staffName, consultDate,
          hasBirthday, groupCount, specialType, note, calcResult } = body;
  if (!customerName) return makeError('Thiếu tên khách hàng', 400);
  if (!calcResult)   return makeError('Thiếu kết quả tính giá', 400);

  const maBQ = generateId('BG', CONFIG.SHEETS.BQ_HEADER, 'MaBaoGia');
  const needsApproval = calcResult.tiLeGiam > CONFIG.APPROVAL_THRESHOLD;

  const header = {
    MaBaoGia:         maBQ,
    NgayTuVan:        consultDate || today(),
    MaNhanVien:       staffId     || '',
    TenTuVanVien:     staffName   || '',
    CoSo:             branch      || '',
    HoTenKhachHang:   customerName,
    SoDienThoai:      phone       || '',
    CoSinhNhat:       hasBirthday ? 'Có' : 'Không',
    SoKhachDiCung:    groupCount  || 1,
    DoiTuongDacBiet:  specialType || 'Không',
    GhiChuTuVan:      note        || '',
    TongGiaNiemYet:   calcResult.totalNY,
    TongGiaSauTQ:     calcResult.totalTQ,
    TongGiaSauSN:     calcResult.totalSN     || '',
    TongGiaCombo:     calcResult.bestComboTotal || '',
    GiaToiUu:         calcResult.bestPlan.total,
    TienGiam:         calcResult.tienGiam,
    TiLeGiam:         calcResult.tiLeGiam,
    QuyenToiUu:       calcResult.bestPlan.label,
    QuaTangTong:      (calcResult.gifts    || []).join(', '),
    CanhBao:          (calcResult.warnings || []).join('; '),
    TrangThaiBaoGia:  needsApproval ? 'Chờ duyệt' : 'Đã duyệt',
    DaDatCoc:         'Chưa',
    SoTienCoc:        0,
    NgayHetHanBaoGia: addDays(CONFIG.QUOTE_VALIDITY_DAYS),
    NguoiDuyetBaoGia: needsApproval ? '' : 'Tự duyệt',
    GhiChuDuyet:      '',
  };
  const writeRes = appendRow(CONFIG.SHEETS.BQ_HEADER, header);

  (calcResult.detailLines || []).forEach((line, idx) => {
    appendRow(CONFIG.SHEETS.BQ_DETAIL, {
      MaChiTiet:      `CT-${maBQ}-${String(idx + 1).padStart(2, '0')}`,
      MaBaoGia:       maBQ,
      MaDichVu:       line.serviceId,
      TenDichVu:      line.serviceName,
      SoLuong:        line.quantity,
      GiaNiemYet_DV:  line.priceNY,
      GiaSauTQ_DV:    line.priceTQ,
      ThanhTienNY:    line.lineNY,
      ThanhTienTQ:    line.lineTQ,
      ComboApDung:    line.comboId    || '',
      GiaCombo_DV:    line.comboPrice || '',
      ThanhTienCombo: line.comboPrice ? line.comboPrice * line.quantity : '',
      KMSinhNhat_DV:  line.snDiscount || 0,
      ThanhTienSN:    line.snDiscount ? line.lineTQ - line.snDiscount : '',
      GiaToiUu_DV:    line.optimalPrice || line.lineTQ,
      QuaTang:        line.gift || '',
      GhiChu:         '',
    });
  });

  return makeSuccess({ maBaoGia: maBQ, trangThai: header.TrangThaiBaoGia, needsApproval, quote: header, row: writeRes.rowNum });
}

function handleApproveQuote(body) {
  const { maBaoGia, approver, decision, note } = body;
  if (!maBaoGia) return makeError('Thiếu mã báo giá', 400);
  const updated = updateRow(CONFIG.SHEETS.BQ_HEADER, 'MaBaoGia', maBaoGia, {
    TrangThaiBaoGia:  decision === 'approve' ? 'Đã duyệt' : 'Từ chối',
    NguoiDuyetBaoGia: approver || 'Quản lý',
    GhiChuDuyet:      note     || '',
  });
  return updated ? makeSuccess({ message: 'Thành công' }) : makeError('Không tìm thấy báo giá', 404);
}

function handleDepositQuote(body) {
  const { maBaoGia, amount } = body;
  if (!maBaoGia) return makeError('Thiếu mã báo giá', 400);
  const updated = updateRow(CONFIG.SHEETS.BQ_HEADER, 'MaBaoGia', maBaoGia, {
    DaDatCoc:        'Đã cọc',
    SoTienCoc:       Number(amount) || 0,
    TrangThaiBaoGia: 'Đã chốt',
  });
  return updated ? makeSuccess({ message: 'Ghi nhận đặt cọc thành công' }) : makeError('Không tìm thấy báo giá', 404);
}

function handleDeleteQuote(body) {
  const { maBaoGia } = body;
  if (!maBaoGia) return makeError('Thiếu mã báo giá', 400);

  function deleteByKey(sheetName, keyField, keyValue) {
    const sh = getSheet(sheetName);
    const hi = getHeaderRowInfo(sh);
    const ki = hi.headers.indexOf(keyField);
    if (ki === -1) return 0;
    const lastRow = sh.getLastRow();
    if (lastRow <= hi.index) return 0;
    const vals = sh.getRange(hi.index + 1, ki + 1, lastRow - hi.index, 1).getValues();
    let n = 0;
    for (let i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]) === String(keyValue)) { sh.deleteRow(hi.index + 1 + i); n++; }
    }
    return n;
  }

  deleteByKey(CONFIG.SHEETS.BQ_DETAIL, 'MaBaoGia', maBaoGia);
  const n = deleteByKey(CONFIG.SHEETS.BQ_HEADER, 'MaBaoGia', maBaoGia);
  return n > 0 ? makeSuccess({ message: 'Đã xóa ' + maBaoGia }) : makeError('Không tìm thấy ' + maBaoGia, 404);
}

function handleGetQuotes(params) {
  ensureBQSheets_();
  const quotes = getSheetData(CONFIG.SHEETS.BQ_HEADER);
  quotes.sort((a, b) => String(b.MaBaoGia).localeCompare(String(a.MaBaoGia)));
  return makeSuccess({ quotes });
}

function handleGetQuote(id) {
  ensureBQSheets_();
  const quote = getSheetData(CONFIG.SHEETS.BQ_HEADER).find(q => String(q.MaBaoGia) === String(id));
  if (!quote) return makeError('Không tìm thấy báo giá: ' + id, 404);
  const details = getSheetData(CONFIG.SHEETS.BQ_DETAIL).filter(d => String(d.MaBaoGia) === String(id));
  return makeSuccess({ quote, details });
}

function handleGetDashboard(branch) {
  ensureBQSheets_();
  const quotes   = getSheetData(CONFIG.SHEETS.BQ_HEADER);
  const filtered = branch ? quotes.filter(q => q.CoSo === branch) : quotes;

  let totalNY = 0, totalToiUu = 0, chotCount = 0, waitCount = 0;
  filtered.forEach(q => {
    totalNY    += Number(q.TongGiaNiemYet) || 0;
    totalToiUu += Number(q.GiaToiUu)       || 0;
    if (q.TrangThaiBaoGia === 'Đã chốt')   chotCount++;
    if (q.TrangThaiBaoGia === 'Chờ duyệt') waitCount++;
  });

  const totalGiam = totalNY - totalToiUu;
  return makeSuccess({
    kpis: {
      totalQuotes:    filtered.length,
      totalNY,       totalToiUu,
      avgDiscount:    totalNY > 0 ? totalGiam / totalNY : 0,
      chotCount,     waitCount,
      conversionRate: filtered.length > 0 ? chotCount / filtered.length : 0,
      totalGiam,
    },
    warnings:     { missingPrice: 0, needVerify: 0, pendingApproval: waitCount },
    recentQuotes: [...filtered]
      .sort((a, b) => String(b.MaBaoGia).localeCompare(String(a.MaBaoGia)))
      .slice(0, 10),
  });
}

// ============================================================
// 6. COMBO ENGINE (port từ comboMatcher.js)
// ============================================================

function expandSet_(setStr) {
  var ids = [];
  setStr.split(',').forEach(function(raw) {
    var part = raw.trim(); if (!part) return;
    if (part.indexOf('~') !== -1) {
      var h = part.split('~'), fr = h[0].trim(), to = h[1].trim();
      var m = fr.match(/^([A-Za-z.\-]+)(\d+)$/);
      if (!m) return;
      var pre = m[1], pad = m[2].length, f = parseInt(m[2]), t = parseInt(to.replace(pre,''));
      for (var i = f; i <= t; i++) ids.push(pre + String(i).padStart(pad,'0'));
    } else { ids.push(part); }
  });
  return ids;
}

function parseConditions_(str) {
  if (!str || str.indexOf('[pending]') !== -1) return [];
  return str.split('+').map(function(raw) {
    var token = raw.trim(), isTgt = token.indexOf('*') !== -1;
    token = token.replace('*','').trim();
    if (token.indexOf('TQ01>=') === 0) return { type:'ANY_TQ01', minPrice: Number(token.replace('TQ01>=','')), isTarget: isTgt };
    if (token.indexOf('TAG:') === 0) {
      var rest = token.replace('TAG:','');
      if (rest.indexOf('>=') !== -1) { var p = rest.split('>='); return { type:'TAG', tag: p[0].trim(), min: Number(p[1])||1, isTarget: isTgt }; }
      return { type:'TAG', tag: rest.trim(), min:1, isTarget: isTgt };
    }
    var setStr = token, minC = 1;
    if (token.indexOf('>=') !== -1) { var ix = token.lastIndexOf('>='); setStr = token.substring(0,ix); minC = Number(token.substring(ix+2))||1; }
    var ids = expandSet_(setStr);
    if (minC > 1)      return { type:'RANGE_MIN', ids, min:minC, isTarget: isTgt };
    if (ids.length > 1) return { type:'OR_EXACT', ids, isTarget: isTgt };
    return { type:'EXACT', id: ids[0], isTarget: isTgt };
  }).filter(Boolean);
}

function matchCondition_(cond, cart, services, excludeIds) {
  excludeIds = excludeIds || [];
  var cartIds = cart.map(i => i.serviceId).filter(id => !excludeIds.includes(id));
  if (cond.type === 'EXACT')    { var met = cartIds.includes(cond.id); return { met, matched: met?[cond.id]:[] }; }
  if (cond.type === 'OR_EXACT') { var m = cond.ids.filter(id => cartIds.includes(id)); return { met: m.length>=1, matched:m }; }
  if (cond.type === 'RANGE_MIN'){ var m = cond.ids.filter(id => cartIds.includes(id)); return { met: m.length>=cond.min, matched:m }; }
  if (cond.type === 'ANY_TQ01') {
    var m = cart.filter(i => { if (excludeIds.includes(i.serviceId)) return false; var s = services.find(sv => sv.MaDichVu===i.serviceId); return s && Number(s.GiaSauKM)>=cond.minPrice; }).map(i=>i.serviceId);
    return { met: m.length>=1, matched:m };
  }
  return { met:false, matched:[] };
}

function matchCombo_(combo, cart, services) {
  var conditions = parseConditions_(combo.DieuKienApDung||'');
  if (!conditions.length) return null;
  var tgtExclude = [];
  conditions.filter(c=>c.isTarget).forEach(cond=>{
    if (cond.type==='EXACT') tgtExclude.push(cond.id);
    else if (cond.ids) cond.ids.filter(id=>cart.find(i=>i.serviceId===id)).forEach(id=>tgtExclude.push(id));
  });
  var crs = conditions.map(cond => {
    var res = matchCondition_(cond, cart, services, cond.type==='ANY_TQ01'?tgtExclude:[]);
    return Object.assign({}, cond, res);
  });
  var allMet = crs.every(c=>c.met);
  var tgtSvcs = crs.filter(c=>c.isTarget&&c.met).reduce((a,c)=>a.concat(c.matched),[]);
  return { combo, allMet, conditionResults:crs, targetServices:tgtSvcs };
}

// ============================================================
// 7. TIỆN ÍCH
// ============================================================

function makeSuccess(data)       { return { success: true, ...data }; }
function makeError(error, code)  { return { success: false, error, code: code||500 }; }
function today()                 { return Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'); }
function addDays(days)           { var d=new Date(); d.setDate(d.getDate()+days); return Utilities.formatDate(d,'GMT+7','yyyy-MM-dd'); }

function generateId(prefix, sheetName, idColName) {
  try {
    const sh = getSheet(sheetName);
    const hi = getHeaderRowInfo(sh);
    const ci = hi.headers.indexOf(idColName);
    if (ci === -1) return prefix + '0001';
    const lr = sh.getLastRow();
    if (lr <= hi.index) return prefix + '0001';
    const vals = sh.getRange(hi.index+1, ci+1, lr-hi.index, 1).getValues();
    let max = 0;
    vals.forEach(r => {
      const v = String(r[0]);
      if (v.startsWith(prefix)) { const n=parseInt(v.substring(prefix.length),10); if (!isNaN(n)&&n>max) max=n; }
    });
    return prefix + String(max+1).padStart(4,'0');
  } catch(e) { return prefix+'0001'; }
}
